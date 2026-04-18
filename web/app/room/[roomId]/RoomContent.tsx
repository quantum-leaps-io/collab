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
import GuestJoin from "@/components/GuestJoin";

export default function RoomContent() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Screen share & recording
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);


  // Resolve auth UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("[Collab] Auth resolved, uid:", user.uid);
        setUid(user.uid);
      } else {
        console.warn("[Collab] No authenticated user");
        setUid(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Initialize WebRTC once we have auth + roomId
  useEffect(() => {
    if (!uid || isInitialized) return;

    const init = async () => {
      try {
        console.log("[Collab] Initializing room:", roomId);

        // 1. Capture local media
        let stream: MediaStream;
        try {
          stream = await getUserMedia();
          console.log("[Collab] Got local media stream");
        } catch (mediaErr) {
          throw new Error(
            "Camera/microphone access denied. Please allow permissions and reload."
          );
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setDisplayStream(stream);

        // 2. Create peer connection
        const pc = createPeerConnection();
        pcRef.current = pc;

        // 3. Prepare remote stream bucket
        const remote = new MediaStream();
        remoteStreamRef.current = remote;
        setRemoteStream(remote);

        // 4. Collect remote tracks
        pc.ontrack = (event) => {
          console.log("[Collab] Got remote track:", event.track.kind);
          event.streams[0]?.getTracks().forEach((track) => {
            remote.addTrack(track);
          });
          setRemoteStream(new MediaStream(remote.getTracks()));
        };

        // 5. Monitor connection state
        pc.onconnectionstatechange = () => {
          console.log("[Collab] Connection state:", pc.connectionState);
          setIsPeerConnected(pc.connectionState === "connected");
        };

        pc.oniceconnectionstatechange = () => {
          console.log("[Collab] ICE state:", pc.iceConnectionState);
        };

        // 6. Add local tracks
        addTracksToConnection(pc, stream);

        // 7. Determine caller vs callee by checking if offer exists in Firestore
        let iAmCaller = false;
        try {
          console.log("[Collab] Attempting to join as callee...");
          const unsub = await joinRoom(roomId, pc);
          unsubRef.current = unsub;
          iAmCaller = false;
          console.log("[Collab] Joined as CALLEE");
        } catch (joinErr) {
          console.log("[Collab] Join failed (room may not exist), becoming CALLER:", joinErr);
          try {
            await createRoom(pc, uid, roomId);
            console.log("[Collab] Room created in Firestore as CALLER");
          } catch (createErr) {
            console.error("[Collab] Failed to create room in Firestore:", createErr);
            throw new Error(
              `Failed to create room: ${createErr instanceof Error ? createErr.message : String(createErr)}. Check Firestore is enabled and rules allow writes.`
            );
          }
          const unsub = listenForAnswer(roomId, pc);
          unsubRef.current = unsub;
          iAmCaller = true;
        }

        setIsCaller(iAmCaller);
        setIsInitialized(true);
        console.log("[Collab] Initialization complete. Caller:", iAmCaller);

      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize call";
        console.error("[Collab] Init error:", err);
        setError(message);
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
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
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

  const handleScreenShareToggle = useCallback(async () => {
    if (isScreenSharing) {
      // Stop sharing
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      setDisplayStream(localStreamRef.current);

      // Revert track to original camera track
      if (pcRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack).catch(console.error);
        }
      }
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      setDisplayStream(screenStream);

      const screenTrack = screenStream.getVideoTracks()[0];
      
      // Listen for browser "Stop Sharing" button
      screenTrack.onended = () => {
        setIsScreenSharing(false);
        screenStreamRef.current = null;
        setDisplayStream(localStreamRef.current);
        if (pcRef.current && localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack).catch(console.error);
          }
        }
      };

      // Replace track for remote peer
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack).catch(console.error);
        }
      }
    } catch (err) {
      console.error("Failed to share screen", err);
    }
  }, [isScreenSharing]);

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      // Prompt user to select what to record (usually the current tab)
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "browser" }, 
        audio: true 
      });
      
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        
        // Export file
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = `Collab-Meeting-${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      // Handle user stopping via browser native button
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [isRecording]);


  if (authLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-dark)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid var(--accent-dim)",
            borderTopColor: "var(--accent)",
            animation: "spin-slow 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!uid) {
    return <GuestJoin />;
  }

  return (
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
          ⚠️ {error}
        </div>
      )}

      {/* Video area */}
      <div style={{ flex: 1, padding: "20px", minHeight: 0 }}>
        <VideoGrid
          localStream={displayStream}
          remoteStream={remoteStream}
          isPeerConnected={isPeerConnected}
        />
      </div>

      {/* Controls toolbar */}
      <CallControls
        onMuteToggle={handleMuteToggle}
        onVideoToggle={handleVideoToggle}
        onScreenShareToggle={handleScreenShareToggle}
        onRecordToggle={handleRecordToggle}
        onEndCall={handleEndCall}
        onCopyRoomId={handleCopyRoomId}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        roomId={roomId}
      />
    </div>
  );
}
