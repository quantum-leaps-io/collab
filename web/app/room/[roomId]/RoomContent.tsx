"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  createPeerConnection,
  getUserMedia,
  addTracksToConnection,
  setAudioEnabled,
  setVideoEnabled,
  closePeerConnection,
} from "@/lib/webrtc";
import { createRoom, joinRoom, listenForAnswer } from "@/lib/signaling";
import VideoGrid from "@/components/VideoGrid";
import CallControls from "@/components/CallControls";
import AuthGuard from "@/components/AuthGuard";

export default function RoomContent() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // Resolve auth UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
    });
    return unsub;
  }, []);

  // Initialize WebRTC once we have auth + roomId
  useEffect(() => {
    if (!uid || isInitialized) return;

    const init = async () => {
      try {
        // 1. Capture local media
        const stream = await getUserMedia();
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. Create peer connection
        const pc = createPeerConnection();
        pcRef.current = pc;

        // 3. Prepare remote stream bucket
        const remote = new MediaStream();
        remoteStreamRef.current = remote;
        setRemoteStream(remote);

        // 4. Collect remote tracks
        pc.ontrack = (event) => {
          event.streams[0]?.getTracks().forEach((track) => {
            remote.addTrack(track);
          });
          setRemoteStream(new MediaStream(remote.getTracks()));
        };

        // 5. Monitor connection state
        pc.onconnectionstatechange = () => {
          setIsPeerConnected(pc.connectionState === "connected");
        };

        // 6. Add local tracks
        addTracksToConnection(pc, stream);

        // 7. Determine caller vs callee
        // Heuristic: if there is no offer in Firestore yet, become caller.
        // We attempt createRoom first; if the room doc already has an offer, joinRoom.
        try {
          // Try to JOIN first (callee path)
          const unsub = await joinRoom(roomId, pc);
          unsubRef.current = unsub;
          setIsCaller(false);
        } catch {
          // Room doesn't exist — become CALLER
          await createRoom(pc, uid, roomId);
          const unsub = listenForAnswer(roomId, pc);
          unsubRef.current = unsub;
          setIsCaller(true);
        }

        setIsInitialized(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize call";
        setError(message);
        console.error(err);
      }
    };

    init();

    return () => {
      unsubRef.current?.();
      closePeerConnection(pcRef.current, [
        localStreamRef.current,
        remoteStreamRef.current,
      ]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, roomId]);

  const handleMuteToggle = useCallback(() => {
    if (localStreamRef.current) {
      const enabled = localStreamRef.current.getAudioTracks()[0]?.enabled ?? true;
      setAudioEnabled(localStreamRef.current, !enabled);
    }
  }, []);

  const handleVideoToggle = useCallback(() => {
    if (localStreamRef.current) {
      const enabled = localStreamRef.current.getVideoTracks()[0]?.enabled ?? true;
      setVideoEnabled(localStreamRef.current, !enabled);
    }
  }, []);

  const handleEndCall = useCallback(() => {
    unsubRef.current?.();
    closePeerConnection(pcRef.current, [
      localStreamRef.current,
      remoteStreamRef.current,
    ]);
    router.push("/");
  }, [router]);

  const handleCopyRoomId = useCallback(() => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).catch(console.error);
  }, [roomId]);

  return (
    <AuthGuard>
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-dark)",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(10,13,20,0.8)",
            backdropFilter: "blur(12px)",
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "linear-gradient(135deg, var(--accent) 0%, #7b5fff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              📡
            </div>
            <span
              style={{
                fontWeight: 800,
                fontSize: 18,
                background: "linear-gradient(90deg, #fff 0%, var(--accent) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              Collab
            </span>
          </div>

          {/* Connection indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              background: isPeerConnected
                ? "rgba(61,214,140,0.1)"
                : "rgba(255,200,0,0.08)",
              border: `1px solid ${isPeerConnected ? "rgba(61,214,140,0.2)" : "rgba(255,200,0,0.15)"}`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isPeerConnected ? "var(--success)" : "#ffc800",
              }}
              className={isPeerConnected ? "" : "animate-blink"}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isPeerConnected ? "var(--success)" : "#ffc800",
                letterSpacing: "0.03em",
              }}
            >
              {isPeerConnected
                ? "Connected"
                : isCaller
                ? "Waiting for peer…"
                : "Connecting…"}
            </span>
          </div>

          <div style={{ width: 80 }} /> {/* spacer */}
        </header>

        {/* Error banner */}
        {error && (
          <div
            style={{
              padding: "12px 24px",
              background: "var(--danger-dim)",
              borderBottom: "1px solid rgba(255,79,109,0.2)",
              color: "var(--danger)",
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ⚠️ {error} — Check your camera/mic permissions and reload.
          </div>
        )}

        {/* Video area */}
        <div style={{ flex: 1, padding: "20px", minHeight: 0 }}>
          <VideoGrid
            localStream={localStream}
            remoteStream={remoteStream}
            isPeerConnected={isPeerConnected}
          />
        </div>

        {/* Controls toolbar */}
        <CallControls
          onMuteToggle={handleMuteToggle}
          onVideoToggle={handleVideoToggle}
          onEndCall={handleEndCall}
          onCopyRoomId={handleCopyRoomId}
          roomId={roomId}
        />
      </div>
    </AuthGuard>
  );
}
