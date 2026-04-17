import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/home_screen.dart';
// import 'firebase_options.dart'; // Uncomment after running flutterfire configure

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // TODO: Replace with your FirebaseOptions from flutterfire configure output.
  // After running `flutterfire configure`, un-comment the import above
  // and replace the line below with:
  // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await Firebase.initializeApp();
  runApp(const CollabApp());
}

class CollabApp extends StatelessWidget {
  const CollabApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Collab',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F7FFF),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        fontFamily: 'Inter',
        scaffoldBackgroundColor: const Color(0xFF0A0D14),
      ),
      home: const HomeScreen(),
    );
  }
}
