"use client";

import { useEffect, useRef } from "react";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isPeerConnected: boolean;
}

export default function VideoGrid({
  localStream,
  remoteStream,
  isPeerConnected,
}: VideoGridProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#05080f",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* ── Remote video (full canvas) ─────────────────── */}
      <video
        id="remote-video"
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {/* ── Peer connecting overlay ────────────────────── */}
      {!isPeerConnected && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: "rgba(5,8,15,0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Animated orbit ring */}
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "var(--accent)",
                animation: "spin-slow 1.2s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 8,
                borderRadius: "50%",
                border: "2px solid transparent",
                borderBottomColor: "rgba(79,127,255,0.4)",
                animation: "spin-slow 1.8s linear infinite reverse",
              }}
            />
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
            className="animate-blink"
          >
            Waiting for peer to join…
          </p>
        </div>
      )}

      {/* ── Local video (picture-in-picture) ──────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 180,
          height: 130,
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          border: "2px solid rgba(79,127,255,0.4)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLDivElement).style.transform = "scale(1.04)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLDivElement).style.transform = "scale(1)")
        }
      >
        <video
          id="local-video"
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "scaleX(-1)", // mirror effect
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 8,
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          You
        </div>
      </div>
    </div>
  );
}
