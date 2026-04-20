import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Gemini API service for reasoning and intent extraction.
/// Takes user speech transcript + navigation context → returns structured intent + response.
class GeminiReasoningService {
  final Dio _dio = Dio();
  final String _apiKey = dotenv.get('GEMINI_API_KEY');

  /// System prompt that teaches Gemini to be "Ira" — the CityPulse assistant
  static const String _systemPrompt = '''
You are "Ira", the CityPulse intelligent navigation assistant. You help users navigate cities in India.

You MUST respond ONLY with valid JSON in this exact format:
{
  "intent": "<INTENT_TYPE>",
  "destination": "<place name or null>",
  "language": "<en|hi|mr>",
  "response": "<natural language response to speak to user>",
  "action_data": {}
}

INTENT TYPES:
- NAVIGATE: User wants to go somewhere. Extract the destination name.
- TRAFFIC_STATUS: User asks about current traffic conditions.
- SIGNAL_INFO: User asks about upcoming traffic signal.
- SPEED_CHECK: User asks about current speed.
- ETA_CHECK: User asks about estimated time of arrival.
- CANCEL_ROUTE: User wants to stop navigation.
- CHANGE_LANGUAGE: User wants to switch language (extract target language).
- GENERAL: Any other question or conversation.

LANGUAGE DETECTION:
- If user speaks in Hindi, set language to "hi"
- If user speaks in Marathi, set language to "mr"
- Default to "en" for English

EXAMPLES:
User: "Hey Ira, take me to MIT WPU"
→ {"intent": "NAVIGATE", "destination": "MIT WPU, Pune", "language": "en", "response": "Sure! Setting up navigation to MIT WPU. Let me find the best route for you.", "action_data": {}}

User: "Ira, aage traffic kaisa hai?"
→ {"intent": "TRAFFIC_STATUS", "destination": null, "language": "hi", "response": "आगे ट्रैफिक की स्थिति देखते हैं।", "action_data": {}}

User: "Ira, signal kitna door hai?"
→ {"intent": "SIGNAL_INFO", "destination": null, "language": "hi", "response": "अगला सिग्नल 200 मीटर आगे है।", "action_data": {}}

User: "Mala Swargate la jaycha ahe"
→ {"intent": "NAVIGATE", "destination": "Swargate, Pune", "language": "mr", "response": "ठीक आहे! स्वारगेटला जाण्यासाठी मार्ग शोधतो.", "action_data": {}}

Be concise. Keep responses under 2 sentences. Always be helpful and friendly.
''';

  /// Send transcript to Gemini for reasoning
  Future<Map<String, dynamic>> processTranscript(String transcript, {
    String? currentLocation,
    int? currentSpeed,
    int? signalCount,
    String? activeSignalState,
    double? distanceToSignal,
    String? currentRoute,
  }) async {
    try {
      // Build context for Gemini
      String context = '';
      if (currentLocation != null) context += 'Current location: $currentLocation. ';
      if (currentSpeed != null) context += 'Current speed: $currentSpeed km/h. ';
      if (signalCount != null) context += 'Signals on route: $signalCount. ';
      if (activeSignalState != null) context += 'Next signal: $activeSignalState, ${distanceToSignal?.toStringAsFixed(0)}m away. ';
      if (currentRoute != null) context += 'Active route: $currentRoute. ';

      final userMessage = context.isNotEmpty
          ? 'Navigation context: [$context]\n\nUser said: "$transcript"'
          : 'User said: "$transcript"';

      final url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$_apiKey';

      final response = await _dio.post(
        url,
        data: {
          'system_instruction': {
            'parts': [{'text': _systemPrompt}]
          },
          'contents': [
            {
              'parts': [{'text': userMessage}]
            }
          ],
          'generationConfig': {
            'temperature': 0.3,
            'maxOutputTokens': 300,
            'responseMimeType': 'application/json',
          }
        },
      );

      if (response.statusCode == 200) {
        final content = response.data['candidates']?[0]?['content']?['parts']?[0]?['text'] ?? '{}';
        final parsed = jsonDecode(content);
        print('[IRA GEMINI] Intent: ${parsed['intent']}, Dest: ${parsed['destination']}, Lang: ${parsed['language']}');
        return parsed;
      }
    } catch (e) {
      print('[IRA GEMINI] Error: $e');
    }

    // Fallback response
    return {
      'intent': 'GENERAL',
      'destination': null,
      'language': 'en',
      'response': 'Sorry, I could not process that. Please try again.',
      'action_data': {},
    };
  }
}
