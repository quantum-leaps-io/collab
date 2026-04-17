import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// ICE server config — mirrors web/lib/iceConfig.ts
const List<Map<String, dynamic>> _iceServers = [
  {'urls': 'stun:stun.l.google.com:19302'},
  {'urls': 'stun:stun1.l.google.com:19302'},
  // Add TURN credentials here when available:
  // {
  //   'urls': 'turn:your-turn-server.example.com:3478',
  //   'username': 'your-username',
  //   'credential': 'your-credential',
  // },
];

const Map<String, dynamic> _peerConnectionConfig = {
  'iceServers': _iceServers,
};

class WebRTCService {
  RTCPeerConnection? _peerConnection;
  MediaStream? localStream;
  MediaStream? remoteStream;

  StreamController<MediaStream?> remoteStreamController =
      StreamController<MediaStream?>.broadcast();

  StreamController<bool> connectionStateController =
      StreamController<bool>.broadcast();

  List<StreamSubscription> _firestoreSubscriptions = [];
  bool _isCaller = false;

  // ─── Setup ─────────────────────────────────────────────────────────────────

  Future<void> init() async {
    // 1. Create peer connection
    _peerConnection = await createPeerConnection(_peerConnectionConfig);

    // 2. Handle remote tracks
    _peerConnection!.onTrack = (RTCTrackEvent event) {
      if (event.streams.isNotEmpty) {
        remoteStream = event.streams[0];
        remoteStreamController.add(remoteStream);
      }
    };

    // 3. Monitor connection state
    _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
      connectionStateController.add(
        state == RTCPeerConnectionState.RTCPeerConnectionStateConnected,
      );
    };

    // 4. Capture local media
    localStream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': {
        'facingMode': 'user',
        'width': {'ideal': 1280},
        'height': {'ideal': 720},
      },
    });

    // 5. Add local tracks to peer connection
    localStream!.getTracks().forEach((track) {
      _peerConnection!.addTrack(track, localStream!);
    });
  }

  // ─── Caller: Create Room ───────────────────────────────────────────────────

  Future<void> createRoom(String roomId) async {
    _isCaller = true;
    final firestore = FirebaseFirestore.instance;
    final roomRef = firestore.collection('rooms').doc(roomId);
    final callerCandidatesRef = roomRef.collection('callerCandidates');

    // Gather ICE candidates
    _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
      callerCandidatesRef.add(candidate.toMap());
    };

    // Create offer
    final offer = await _peerConnection!.createOffer();
    await _peerConnection!.setLocalDescription(offer);

    await roomRef.set({
      'offer': {'type': offer.type, 'sdp': offer.sdp},
      'createdBy': FirebaseAuth.instance.currentUser?.uid,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // Listen for callee's answer
    final answerSub = roomRef.snapshots().listen((snapshot) async {
      final data = snapshot.data();
      if (data != null && data['answer'] != null) {
        final remoteDesc = await _peerConnection!.getRemoteDescription();
        if (remoteDesc == null) {
          final answer = RTCSessionDescription(
            data['answer']['sdp'],
            data['answer']['type'],
          );
          await _peerConnection!.setRemoteDescription(answer);
        }
      }
    });
    _firestoreSubscriptions.add(answerSub);

    // Listen for callee's ICE candidates
    final calleeSub = roomRef
        .collection('calleeCandidates')
        .snapshots()
        .listen((snapshot) {
      for (final change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          final data = change.doc.data()!;
          _peerConnection!.addCandidate(
            RTCIceCandidate(
              data['candidate'],
              data['sdpMid'],
              data['sdpMLineIndex'],
            ),
          );
        }
      }
    });
    _firestoreSubscriptions.add(calleeSub);
  }

  // ─── Callee: Join Room ─────────────────────────────────────────────────────

  Future<void> joinRoom(String roomId) async {
    _isCaller = false;
    final firestore = FirebaseFirestore.instance;
    final roomRef = firestore.collection('rooms').doc(roomId);
    final calleeCandidatesRef = roomRef.collection('calleeCandidates');

    final roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists) {
      throw Exception('Room $roomId not found');
    }

    final roomData = roomSnapshot.data()!;

    // Set caller's offer as remote description
    final offer = RTCSessionDescription(
      roomData['offer']['sdp'],
      roomData['offer']['type'],
    );
    await _peerConnection!.setRemoteDescription(offer);

    // Create and set answer
    final answer = await _peerConnection!.createAnswer();
    await _peerConnection!.setLocalDescription(answer);

    // Gather ICE candidates
    _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
      calleeCandidatesRef.add(candidate.toMap());
    };

    // Write answer to Firestore
    await roomRef.update({
      'answer': {'type': answer.type, 'sdp': answer.sdp},
    });

    // Listen for caller's ICE candidates
    final callerSub = roomRef
        .collection('callerCandidates')
        .snapshots()
        .listen((snapshot) {
      for (final change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          final data = change.doc.data()!;
          _peerConnection!.addCandidate(
            RTCIceCandidate(
              data['candidate'],
              data['sdpMid'],
              data['sdpMLineIndex'],
            ),
          );
        }
      }
    });
    _firestoreSubscriptions.add(callerSub);
  }

  // ─── Media Controls ────────────────────────────────────────────────────────

  void toggleMute() {
    final audioTrack = localStream?.getAudioTracks().firstOrNull;
    if (audioTrack != null) audioTrack.enabled = !audioTrack.enabled;
  }

  void toggleVideo() {
    final videoTrack = localStream?.getVideoTracks().firstOrNull;
    if (videoTrack != null) videoTrack.enabled = !videoTrack.enabled;
  }

  // ─── Teardown ──────────────────────────────────────────────────────────────

  Future<void> dispose() async {
    for (final sub in _firestoreSubscriptions) {
      await sub.cancel();
    }
    _firestoreSubscriptions.clear();

    localStream?.getTracks().forEach((t) => t.stop());
    await localStream?.dispose();
    await remoteStream?.dispose();
    await _peerConnection?.close();

    remoteStreamController.close();
    connectionStateController.close();
  }
}
