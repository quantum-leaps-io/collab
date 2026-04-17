# 📡 Collab — Cross-Platform WebRTC Video Calling

Crystal-clear 1-to-1 video calls on Web (Next.js) and Mobile (Flutter), using Cloud Firestore as the signaling layer.

## Monorepo Structure

```
collab/
├── web/               ← Next.js 14 (App Router) web app
├── mobile/            ← Flutter app (Android + iOS)
└── firestore.rules    ← Firestore security rules
```

---

## Quick Start

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Firestore Database** (start in test mode, then apply `firestore.rules`)
4. Enable **Authentication → Sign-in method → Google**

---

### 2. Web App (`collab/web/`)

#### Configure Firebase

Edit `web/.env.local` and replace placeholder values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### Run

```bash
cd web
npm install
npm run dev     # → http://localhost:3000
```

---

### 3. Mobile App (`collab/mobile/`)

#### Configure Firebase

Run `flutterfire configure` in the `mobile/` directory:

```bash
cd mobile
dart pub global activate flutterfire_cli
flutterfire configure
```

This generates `lib/firebase_options.dart`. Then update `main.dart`:

```dart
// Uncomment this import
import 'firebase_options.dart';

// Change:
await Firebase.initializeApp();
// To:
await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
```

#### Run

```bash
cd mobile
flutter pub get
flutter run
```

---

### 4. Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point to your project
firebase deploy --only firestore:rules
```

---

## How It Works

```
Caller                              Callee
  |                                    |
  |-- createOffer() ────────────────── |
  |-- rooms/{id}.offer ─► Firestore   |
  |                            reads offer
  |                         createAnswer()
  |                      rooms/{id}.answer ─► Firestore
  |◄── reads answer ─────────────────  |
  |                                    |
  |◄── ICE exchange (sub-collections) ─|
  |                                    |
  |════════ P2P WebRTC Stream ═════════|
```

---

## TURN Server (Production)

Add your TURN credentials to:
- **Web**: `web/lib/iceConfig.ts`
- **Flutter**: `mobile/lib/services/webrtc_service.dart`

Recommended providers: **Twilio Network Traversal**, **Cloudflare Calls**, or self-hosted **coturn**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Mobile | Flutter + flutter_webrtc |
| Signaling | Cloud Firestore (real-time) |
| Auth | Firebase Auth (Google Sign-In) |
| NAT Traversal | Google STUN + TURN (configurable) |
