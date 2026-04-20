import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// Sarvam AI Speech-to-Text service via WebSocket.
/// Streams raw PCM audio and receives real-time transcription.
class SarvamSttService {
  WebSocketChannel? _channel;
  final StreamController<String> _transcriptController = StreamController<String>.broadcast();
  final StreamController<String> _partialController = StreamController<String>.broadcast();

  Stream<String> get onTranscript => _transcriptController.stream;
  Stream<String> get onPartial => _partialController.stream;

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  /// Connect to Sarvam STT WebSocket with API key in headers
  Future<void> connect({String languageCode = 'en-IN'}) async {
    try {
      final apiKey = dotenv.get('SARVAM_API_KEY');
      final wsUrl = 'wss://api.sarvam.ai/speech-to-text/ws'
          '?language-code=$languageCode'
          '&model=saaras:v3'
          '&sample_rate=16000'
          '&input_audio_codec=pcm_s16le';

      print('[IRA STT] Connecting to Sarvam: $languageCode');

      // Use IOWebSocketChannel to pass the API key as a header
      _channel = IOWebSocketChannel.connect(
        Uri.parse(wsUrl),
        headers: {
          'api-subscription-key': apiKey,
        },
      );

      // Wait for the connection to be ready (with timeout)
      try {
        await _channel!.ready.timeout(const Duration(seconds: 5));
      } catch (readyError) {
        print('[IRA STT] Connection handshake failed: $readyError');
        _channel = null;
        _isConnected = false;
        return;
      }

      _isConnected = true;

      _channel!.stream.listen(
        (message) {
          _handleMessage(message);
        },
        onError: (error) {
          print('[IRA STT] WebSocket Error: $error');
          _isConnected = false;
        },
        onDone: () {
          print('[IRA STT] WebSocket Closed');
          _isConnected = false;
        },
      );

      print('[IRA STT] Connected successfully!');
    } catch (e) {
      print('[IRA STT] Connection failed: $e');
      _isConnected = false;
    }
  }

  /// Handle incoming WebSocket messages from Sarvam
  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String);
      
      // Sarvam sends different event types
      final type = data['type'] ?? data['event'] ?? '';
      final text = data['text'] ?? data['transcript'] ?? '';
      final isFinal = data['is_final'] ?? data['final'] ?? false;

      if (text.isNotEmpty) {
        if (isFinal == true) {
          print('[IRA STT] ✅ Final: $text');
          _transcriptController.add(text);
        } else {
          print('[IRA STT] 🔄 Partial: $text');
          _partialController.add(text);
        }
      }
    } catch (e) {
      // Some messages might be plain text
      final text = message.toString().trim();
      if (text.isNotEmpty && text != 'ping' && text != 'pong') {
        print('[IRA STT] Raw: $text');
        _transcriptController.add(text);
      }
    }
  }

  /// Send PCM audio chunk to Sarvam
  void sendAudioChunk(Uint8List chunk) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(chunk);
    }
  }

  /// Disconnect from Sarvam STT
  Future<void> disconnect() async {
    if (_channel != null) {
      try {
        await _channel!.sink.close();
      } catch (_) {}
      _channel = null;
      _isConnected = false;
      print('[IRA STT] Disconnected');
    }
  }

  void dispose() {
    disconnect();
    _transcriptController.close();
    _partialController.close();
  }
}
