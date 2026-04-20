import 'dart:io';
import 'dart:typed_data';
import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:path_provider/path_provider.dart';

/// TTS Service that calls the backend Piper TTS server. (Singleton)
class TtsService {
  static final TtsService _instance = TtsService._internal();
  factory TtsService() => _instance;

  final Dio _dio = Dio();
  final AudioPlayer _player = AudioPlayer();
  
  // Force correct IP for stability
  final String _ttsUrl = 'http://172.16.21.80:5001';

  bool _isSpeaking = false;
  bool get isSpeaking => _isSpeaking;

  TtsService._internal() {
    _player.setSource(AssetSource('audio/empty.mp3')).catchError((e) => null); // Cold start engine
  }

  Future<void> speak(String text, {String language = 'en'}) async {
    if (text.isEmpty) return;

    try {
      _isSpeaking = true;
      print('[IRA TTS] Requesting Audio for ($language): "$text"');

      final response = await _dio.post(
        '$_ttsUrl/tts',
        data: {
          'text': text,
          'language': language,
        },
        options: Options(
          responseType: ResponseType.bytes,
          receiveTimeout: const Duration(seconds: 15),
        ),
      );

      if (response.statusCode == 200) {
        final Uint8List bytes = response.data;
        print('[IRA TTS] Received WAV bytes: ${bytes.length}');

        final tempDir = await getTemporaryDirectory();
        final file = File('${tempDir.path}/ira_voice.wav');
        await file.writeAsBytes(bytes);

        await _player.stop();
        await _player.play(DeviceFileSource(file.path));
        print('[IRA TTS] Playback started');
      } else {
        print('[IRA TTS ERROR] Server returned status: ${response.statusCode}');
      }
    } catch (e) {
      print('[IRA TTS ERROR] $e');
    } finally {
      _isSpeaking = false;
    }
  }

  Future<void> stop() async {
    await _player.stop();
    _isSpeaking = false;
  }
}
