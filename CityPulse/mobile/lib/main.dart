import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'theme/app_theme.dart';
import 'screens/auth_screen.dart';
import 'screens/home_map_screen.dart';
import 'screens/navigation_screen.dart';
import 'screens/destination_feedback_screen.dart';
import 'screens/directions_list_screen.dart';
import 'providers/map_provider.dart';
import 'services/assistant_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: "../.env");
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => MapProvider()),
        ChangeNotifierProxyProvider<MapProvider, AssistantService>(
          create: (_) => AssistantService(),
          update: (_, mapProvider, assistant) {
            assistant?.attachMapProvider(mapProvider);
            return assistant!;
          },
        ),
      ],
      child: const CityPulseApp(),
    ),
  );
}

class CityPulseApp extends StatelessWidget {
  const CityPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CityPulse',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: '/auth',
      routes: {
        '/auth': (context) => const AuthScreen(),
        '/home': (context) => const HomeMapScreen(),
        '/navigation': (context) => const NavigationScreen(),
        '/feedback': (context) => const DestinationFeedbackScreen(),
        '/directions': (context) => const DirectionsListScreen(),
      },
    );
  }
}
