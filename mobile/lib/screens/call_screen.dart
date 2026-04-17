import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../services/webrtc_service.dart';

class CallScreen extends StatefulWidget {
  final String roomId;
  final bool isCaller;

  const CallScreen({
    super.key,
    required this.roomId,
    required this.isCaller,
  });

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final _webrtcService = WebRTCService();
  final _localRenderer = RTCVideoRenderer();
  final _remoteRenderer = RTCVideoRenderer();

  bool _isPeerConnected = false;
  bool _isMuted = false;
  bool _isVideoOff = false;
  bool _initialized = false;
  String? _error;

  StreamSubscription? _remoteSub;
  StreamSubscription? _connSub;

  @override
  void initState() {
    super.initState();
    _initCall();
  }

  Future<void> _initCall() async {
    try {
      await _localRenderer.initialize();
      await _remoteRenderer.initialize();
      await _webrtcService.init();

      if (widget.isCaller) {
        await _webrtcService.createRoom(widget.roomId);
      } else {
        await _webrtcService.joinRoom(widget.roomId);
      }

      // Attach local stream
      _localRenderer.srcObject = _webrtcService.localStream;
      setState(() {});

      // Listen for remote stream
      _remoteSub = _webrtcService.remoteStreamController.stream.listen((stream) {
        setState(() {
          _remoteRenderer.srcObject = stream;
        });
      });

      // Listen for connection state
      _connSub = _webrtcService.connectionStateController.stream.listen((connected) {
        setState(() => _isPeerConnected = connected);
      });

      setState(() => _initialized = true);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  void _toggleMute() {
    _webrtcService.toggleMute();
    setState(() => _isMuted = !_isMuted);
  }

  void _toggleVideo() {
    _webrtcService.toggleVideo();
    setState(() => _isVideoOff = !_isVideoOff);
  }

  void _copyRoomId() {
    // In a real app: use clipboard package
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Room ID: ${widget.roomId}'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF1E2A40),
      ),
    );
  }

  Future<void> _endCall() async {
    await _webrtcService.dispose();
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Future<void> dispose() async {
    await _remoteSub?.cancel();
    await _connSub?.cancel();
    await _webrtcService.dispose();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05080F),
      body: Stack(
        children: [
          // ── Remote video (full screen) ────────────────────────────────────
          Positioned.fill(
            child: _isPeerConnected
                ? RTCVideoView(
                    _remoteRenderer,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  )
                : _buildWaitingOverlay(),
          ),

          // ── Error banner ──────────────────────────────────────────────────
          if (_error != null)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                color: const Color(0x33FF4F6D),
                padding: const EdgeInsets.all(12),
                child: SafeArea(
                  child: Text(
                    '⚠️ $_error',
                    style: const TextStyle(color: Color(0xFFFF4F6D), fontSize: 13),
                  ),
                ),
              ),
            ),

          // ── Top bar ───────────────────────────────────────────────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    // Logo
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF4F7FFF), Color(0xFF7B5FFF)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(child: Text('📡', style: TextStyle(fontSize: 16))),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      'Collab',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const Spacer(),
                    // Status pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _isPeerConnected
                            ? const Color(0x193DD68C)
                            : const Color(0x14FFC800),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: _isPeerConnected
                              ? const Color(0x333DD68C)
                              : const Color(0x26FFC800),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: _isPeerConnected
                                  ? const Color(0xFF3DD68C)
                                  : const Color(0xFFFFC800),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _isPeerConnected
                                ? 'Connected'
                                : widget.isCaller
                                    ? 'Waiting for peer…'
                                    : 'Connecting…',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _isPeerConnected
                                  ? const Color(0xFF3DD68C)
                                  : const Color(0xFFFFC800),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Local video (PiP) ─────────────────────────────────────────────
          Positioned(
            bottom: 100,
            right: 16,
            child: SizedBox(
              width: 100,
              height: 140,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: const Color(0x664F7FFF),
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: _initialized
                      ? RTCVideoView(
                          _localRenderer,
                          mirror: true,
                          objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                        )
                      : Container(color: const Color(0xFF111724)),
                ),
              ),
            ),
          ),

          // ── Controls toolbar ──────────────────────────────────────────────
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).padding.bottom + 12,
                top: 16,
                left: 24,
                right: 24,
              ),
              decoration: const BoxDecoration(
                color: Color(0xD90A0D14),
                border: Border(
                  top: BorderSide(color: Color(0x12FFFFFF)),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _ControlButton(
                    icon: _isMuted ? Icons.mic_off : Icons.mic,
                    label: _isMuted ? 'Unmute' : 'Mute',
                    active: !_isMuted,
                    onTap: _toggleMute,
                  ),
                  _ControlButton(
                    icon: _isVideoOff ? Icons.videocam_off : Icons.videocam,
                    label: _isVideoOff ? 'Start Video' : 'Stop Video',
                    active: !_isVideoOff,
                    onTap: _toggleVideo,
                  ),
                  _ControlButton(
                    icon: Icons.link,
                    label: 'Share',
                    active: true,
                    onTap: _copyRoomId,
                  ),
                  _ControlButton(
                    icon: Icons.call_end,
                    label: 'End',
                    active: false,
                    danger: true,
                    onTap: _endCall,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaitingOverlay() {
    return Container(
      color: const Color(0xD905080F),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(
              color: Color(0xFF4F7FFF),
              strokeWidth: 2.5,
            ),
            const SizedBox(height: 20),
            Text(
              'Waiting for peer to join…',
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final bool danger;
  final VoidCallback onTap;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: danger
                  ? const Color(0x26FF4F6D)
                  : active
                      ? const Color(0x264F7FFF)
                      : const Color(0x0FFFFFFF),
              shape: BoxShape.circle,
              border: Border.all(
                color: danger
                    ? const Color(0x4DFF4F6D)
                    : active
                        ? const Color(0x4D4F7FFF)
                        : const Color(0x14FFFFFF),
              ),
            ),
            child: Icon(
              icon,
              size: 22,
              color: danger
                  ? const Color(0xFFFF4F6D)
                  : active
                      ? const Color(0xFF4F7FFF)
                      : Colors.white.withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: Colors.white.withOpacity(0.5),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
