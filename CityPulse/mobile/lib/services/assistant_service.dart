import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:path_provider/path_provider.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:record/record.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_pcm_sound/flutter_pcm_sound.dart';
import 'package:audio_session/audio_session.dart';
import '../providers/map_provider.dart';
import 'tts_service.dart';

enum AssistantState { idle, listening, thinking, speaking }

class AssistantService extends ChangeNotifier {
  WebSocketChannel? _channel;
  final AudioRecorder _audioRecorder = AudioRecorder();
  StreamSubscription<Uint8List>? _recordSub;
  Timer? _pingTimer;
  Timer? _debounceTimer;

  // Master Integration Config - Switched to LOCAL for stability
  // Force correct IP for stability
  final String _endpoint = 'ws://172.16.21.80:5001/ws/voice';
  
  final String _lang = "en-IN";
  final int _outboundSampleRate = 16000;
  final int _inboundSampleRate = 22050;
  
  // Local Gemini Reasoning Engine
  GenerativeModel? _geminiModel;
  ChatSession? _geminiChat;
  
  String? _userId;
  late final String _sessionId;
  MapProvider? _mapProvider;

  // Internal Trackers
  AssistantState _state = AssistantState.idle;
  bool _isConnected = false;
  bool _isAiSpeaking = false;
  bool _ignoreIraAudio = false; 
  DateTime _expectedAudioFinishTime = DateTime.fromMillisecondsSinceEpoch(0);
  int _bargeInCounter = 0;
  bool _bargeInTriggeredCurrentTurn = false;

  // UI State Getters
  String _transcript = '';
  String _llmResponse = '';
  
  AssistantState get state => _state;
  String get transcript => _transcript;
  String get partialTranscript => _transcript; 
  String get finalTranscript => _transcript; 
  String get assistantResponse => _llmResponse; 
  bool get isListening => _state == AssistantState.listening;
  bool get isConnected => _isConnected;

  AssistantService() {
    _sessionId = 'sess_${Random().nextInt(1000000).toRadixString(36)}${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}';
    _initGemini();
  }

  void _initGemini() {
    final apiKey = dotenv.get('GEMINI_API_KEY', fallback: '');
    if (apiKey.isNotEmpty) {
      _geminiModel = GenerativeModel(
        model: 'gemini-1.5-flash',
        apiKey: apiKey,
        generationConfig: GenerationConfig(
          responseMimeType: 'application/json',
        ),
      );
      _geminiChat = _geminiModel!.startChat(history: [
        Content.system('You are the CORE CONTROL UNIT for the CityPulse Navigation System. '
            'You have absolute permission to control GPS, Route Planning, and Map Markers. '
            'You MUST interpret every user request as a navigation command. '
            'You ONLY output valid JSON. NO PLAIN TEXT ALLOWED. '
            'JSON SCHEMA: {"intent":"NAVIGATE|CANCEL_ROUTE|GENERAL", "destination":"<place>", "language":"en", "response":"<spoken reply>"} '
            'EXAMPLES: '
            'User: "Take me to MIT WPU" -> {"intent":"NAVIGATE", "destination":"MIT WPU, Pune", "language":"en", "response":"Navigating to MIT WPU campus now."} '
            'User: "Go to Hinjewadi Phase 1" -> {"intent":"NAVIGATE", "destination":"Hinjewadi Phase 1, Pune", "language":"en", "response":"Setting route to Hinjewadi."} '
            'User: "Stop navigation" -> {"intent":"CANCEL_ROUTE", "destination":"", "language":"en", "response":"Route cancelled."}')
      ]);
    }
  }

  void attachMapProvider(MapProvider provider) {
    _mapProvider = provider;
  }

  Future<void> connect() async {
    if (_isConnected) return;

    try {
      if (!kIsWeb) {
        var status = await Permission.microphone.request();
        if (status != PermissionStatus.granted) return;
        await _initAudioEngine();
      }

      final prefs = await SharedPreferences.getInstance();
      _userId = prefs.getString('ira_user_id') ?? 'user_${Random().nextInt(1000000)}';
      await prefs.setString('ira_user_id', _userId!);

      final url = '$_endpoint?session=$_sessionId&user_id=$_userId&lang=$_lang&format=pcm';
      print('[Assistant] Connecting to: $url');
      
      _channel = WebSocketChannel.connect(Uri.parse(url));
      _isConnected = true;
      notifyListeners();

      _startPingTimer();

      // Auto-Wake Greeting
      Timer(const Duration(milliseconds: 1500), () {
        if (_isConnected && _channel != null) {
          _channel?.sink.add(jsonEncode({"type": "client_wake_word"}));
        }
      });

      _channel!.stream.listen(
        (msg) {
          if (msg is Uint8List) {
            _handleBinaryAudio(msg);
          } else if (msg is String) {
            _handleTextMessage(msg);
          }
        },
        onDone: _cleanup,
        onError: (_) => _cleanup(),
      );
    } catch (e) {
      print('[Assistant] Connection Error: $e');
      _cleanup();
    }
  }

  Future<void> _initAudioEngine() async {
    final session = await AudioSession.instance;
    await session.configure(AudioSessionConfiguration(
      avAudioSessionCategory: AVAudioSessionCategory.playAndRecord,
      avAudioSessionCategoryOptions: AVAudioSessionCategoryOptions.allowBluetooth | AVAudioSessionCategoryOptions.defaultToSpeaker,
      avAudioSessionMode: AVAudioSessionMode.voiceChat,
      androidAudioAttributes: const AndroidAudioAttributes(
        contentType: AndroidAudioContentType.speech,
        usage: AndroidAudioUsage.voiceCommunication,
      ),
      androidAudioFocusGainType: AndroidAudioFocusGainType.gain,
      androidWillPauseWhenDucked: true,
    ));
    await session.setActive(true);
    
    // Using setup() and play() for 1.2.7 API
    await FlutterPcmSound.setup(sampleRate: _inboundSampleRate, channelCount: 1);
    await FlutterPcmSound.play();
  }

  void _handleBinaryAudio(Uint8List data) async {
    // 🔇 SILENCED: We are bypassing the legacy backend's voice responses
    // so that they don't 'talk over' our local Gemini reasoning engine.
    return;
  }

  void _handleTextMessage(String msg) {
    try {
      final data = jsonDecode(msg);
      switch (data['type']) {
        case 'llm_content':
          _state = AssistantState.speaking;
          _isAiSpeaking = true;
          _llmResponse = data['content'] ?? '';
          notifyListeners();
          break;
        case 'assistant_result':
          // We ignore School Bot assistant_result because we use Gemini instead
          break;
        case 'transcript':
          final inner = data['data'] ?? data;
          String newText = inner['transcript'] ?? '';
          if (newText.isEmpty) return;
          
          _transcript = newText;
          final isFinal = inner['is_final'] ?? false;
          
          // ⏱️ Auto-trigger Reasoning if backend is stingy with is_final
          _debounceTimer?.cancel();
          if (isFinal) {
            _stopPlayback(); 
            _ignoreIraAudio = true;
            _reasonWithGemini(_transcript);
          } else {
            _debounceTimer = Timer(const Duration(milliseconds: 800), () {
              if (_transcript.isNotEmpty && _state == AssistantState.listening) {
                print('[Assistant] Debounce Timeout: Treating transcript as FINAL');
                _stopPlayback(); 
                _ignoreIraAudio = true;
                _reasonWithGemini(_transcript);
              }
            });
            _ignoreIraAudio = false; 
            _state = AssistantState.listening;
          }
          notifyListeners();
          break;
        case 'end_speech':
          // 🚀 [NEW] Immediate trigger on VAD end speech
          if (_transcript.isNotEmpty && _state == AssistantState.listening) {
            print('[Assistant] VAD END_SPEECH: Triggering reasoning immediately');
            _debounceTimer?.cancel();
            _stopPlayback(); 
            _ignoreIraAudio = true;
            _reasonWithGemini(_transcript);
          }
          break;
        case 'stop_audio':
          _stopPlayback();
          break;
        case 'llm_done':
          // We handle done in _reasonWithGemini
          break;
      }
    } catch (e) {}
  }

  Future<void> _reasonWithGemini(String input) async {
    if (_geminiChat == null) return;
    print('[IRA] RECEIVED FINAL TRANSCRIPT: "$input"');
    print('[Gemini] Reasoning started...');
    
    try {
      final response = await _geminiChat!.sendMessage(Content.text(input));
      final text = response.text;
      print('[Gemini] RAW AI RESPONSE: $text');
      
      if (text != null) {
        try {
          String jsonStr = text;
          if (text.contains('```')) {
            final match = RegExp(r'\{.*\}', dotAll: true).firstMatch(text);
            if (match != null) jsonStr = match.group(0)!;
          }
          
          final data = jsonDecode(jsonStr);
          print('[Gemini] PARSED JSON: $data');

          _llmResponse = data['response'] ?? (text.length > 100 ? "Processing request..." : text);
          
          // 🗣️ Speak Gemini's words - catch errors so task continues
          try {
            TtsService().speak(_llmResponse, language: data['language'] ?? 'en');
          } catch (e) {
            print('[IRA TTS ERROR] $e');
          }
          
          await _executeIntent(data);
          
          _state = AssistantState.idle;
          _ignoreIraAudio = false; 
          notifyListeners();
        } catch (e) {
          print('[Gemini JSON ERROR] $e');
          _llmResponse = text;
          TtsService().speak(_llmResponse);
          _state = AssistantState.idle;
          _ignoreIraAudio = false;
          notifyListeners();
        }
      }
    } catch (e) {
       print('[Gemini ENGINE ERROR] $e');
       _state = AssistantState.idle;
       _ignoreIraAudio = false;
       notifyListeners();
    }
  }

  Future<void> _executeIntent(Map<String, dynamic> data) async {
    final String? intent = data['intent']?.toString().toUpperCase();
    final String? dest = data['destination']?.toString();
    
    print('[IRA] EXECUTE INTENT: $intent | DEST: $dest');

    if (intent == 'NAVIGATE' && dest != null && dest.isNotEmpty) {
      if (_mapProvider == null) {
        print('[IRA ERROR] MapProvider is NULL! Ensure attachMapProvider() is called in UI.');
        return;
      }
      
      print('[IRA] Navigation Logic Started for: $dest');
      _mapProvider!.clearRoute();
      
      // 🛰️ Search and Auto-Select First Result
      await _mapProvider!.searchPlaces(dest);
      
      if (_mapProvider!.suggestions.isNotEmpty) {
        final bestMatchSource = _mapProvider!.suggestions.first;
        final placeId = bestMatchSource['place_id'];
        final description = bestMatchSource['description'];
        
        print('[IRA] Auto-selecting best match: $description');
        await _mapProvider!.setDestination(placeId, description);
        print('[IRA] Task Complete: Starting Navigation UI.');
        _mapProvider!.startNavigation();
      } else {
        print('[IRA ERROR] Google Search returned NO suggested places for search term: "$dest"');
        _llmResponse = "I found the address $dest, but it doesn't appear on my map. Please be more specific.";
        notifyListeners();
        TtsService().speak(_llmResponse);
      }
    } else if (intent == 'CANCEL_ROUTE') {
       print('[IRA] Task: Cancel Route');
       _mapProvider?.clearRoute();
    } else {
      print('[IRA] No matching intent found for this JSON payload.');
    }
  }

  Future<void> startListening() async {
    if (!_isConnected) await connect();
    _state = AssistantState.listening;
    _transcript = '';
    
    // 🛡️ RESET Gemini Session to prevent "poisoned" history
    _initGemini(); 

    notifyListeners();

    final config = RecordConfig(
      encoder: AudioEncoder.pcm16bits,
      sampleRate: 16000,
      numChannels: 1,
      echoCancel: true,
      autoGain: true,
      androidConfig: const AndroidRecordConfig(
        audioSource: AndroidAudioSource.voiceCommunication,
      ),
    );

    if (await _audioRecorder.hasPermission()) {
      final stream = await _audioRecorder.startStream(config);
      int chunkCount = 0;
      _recordSub = stream.listen((data) {
        if (_isConnected) {
          chunkCount++;
          if (chunkCount % 50 == 0) {
             print('[PCM] Captured 50 chunks of audio data (Total: $chunkCount)');
          }
          double rms = _calculateRms(data);
          bool isPlaying = DateTime.now().isBefore(_expectedAudioFinishTime.add(const Duration(milliseconds: 250)));
          bool isAiActive = _isAiSpeaking || isPlaying;
          double threshold = isAiActive ? 0.05 : 0.03;

          // Barge-in sensing
          if (isAiActive && rms > threshold && !_bargeInTriggeredCurrentTurn) {
            _bargeInCounter++;
            if (_bargeInCounter >= 3) {
              _bargeInTriggeredCurrentTurn = true;
              _stopPlayback();
              _channel?.sink.add(jsonEncode({"type": "audio_signal", "data": {"signal_type": "START_SPEECH"}}));
            }
          } else {
            _bargeInCounter = 0;
          }

          _channel?.sink.add(jsonEncode({
            "type": "audio",
            "audio": {"data": base64Encode(data), "sample_rate": _outboundSampleRate}
          }));
        }
      });
    }
  }

  Future<void> stopListening() async {
    _state = AssistantState.idle;
    await _recordSub?.cancel();
    _recordSub = null;
    await _audioRecorder.stop();
    notifyListeners();
  }

  void _stopPlayback() {
    try {
      FlutterPcmSound.stop();
    } catch (e) {}
    _isAiSpeaking = false;
    _expectedAudioFinishTime = DateTime.fromMillisecondsSinceEpoch(0);
    notifyListeners();
  }

  double _calculateRms(Uint8List buffer) {
    if (buffer.isEmpty) return 0.0;
    double sum = 0;
    final view = ByteData.sublistView(buffer);
    int sampleCount = buffer.length ~/ 2;
    for (int i = 0; i < sampleCount; i++) {
      double norm = view.getInt16(i * 2, Endian.little) / 32768.0;
      sum += norm * norm;
    }
    return sqrt(sum / sampleCount);
  }

  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 20), (t) {
      if (_isConnected) _channel?.sink.add(jsonEncode({"type": "ping"}));
    });
  }

  void _cleanup() {
    _isConnected = false;
    _pingTimer?.cancel();
    _stopPlayback();
    notifyListeners();
  }

  @override
  void dispose() {
    _cleanup();
    _audioRecorder.dispose();
    super.dispose();
  }
}
