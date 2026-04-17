"use client";

import { useState } from "react";

interface CallControlsProps {
  onMuteToggle: () => void;
  onVideoToggle: () => void;
  onEndCall: () => void;
  onCopyRoomId: () => void;
  roomId: string;
}

interface ControlButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}

function ControlButton({
  id,
  icon,
  label,
  active = true,
  danger = false,
  onClick,
}: ControlButtonProps) {
  const [hovered, setHovered] = useState(false);

  const bg = danger
    ? hovered
      ? "rgba(255,79,109,0.9)"
      : "var(--danger-dim)"
    : !active
    ? hovered
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.06)"
    : hovered
    ? "rgba(79,127,255,0.25)"
    : "var(--accent-dim)";

  const iconColor = danger
    ? "#ff4f6d"
    : active
    ? "var(--accent)"
    : "var(--text-secondary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <button
        id={id}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={label}
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: danger
            ? "1px solid rgba(255,79,109,0.3)"
            : active
            ? "1px solid rgba(79,127,255,0.3)"
            : "1px solid var(--border)",
          background: bg,
          color: danger ? (hovered ? "#fff" : iconColor) : iconColor,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          transition: "all 0.18s ease",
          transform: hovered ? "scale(1.1)" : "scale(1)",
          boxShadow: hovered && danger
            ? "0 0 20px rgba(255,79,109,0.35)"
            : hovered && active
            ? "0 0 20px var(--accent-glow)"
            : "none",
        }}
      >
        {icon}
      </button>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          fontWeight: 500,
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function CallControls({
  onMuteToggle,
  onVideoToggle,
  onEndCall,
  onCopyRoomId,
  roomId,
}: CallControlsProps) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleMute = () => {
    setMuted((m) => !m);
    onMuteToggle();
  };

  const handleVideo = () => {
    setVideoOff((v) => !v);
    onVideoToggle();
  };

  const handleCopy = () => {
    onCopyRoomId();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "16px 32px",
        background: "rgba(10,13,20,0.85)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {/* Room ID chip */}
      <div
        style={{
          position: "absolute",
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          background: "var(--accent-dim)",
          border: "1px solid rgba(79,127,255,0.2)",
          borderRadius: "var(--radius-full)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Room
        </span>
        <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.1em" }}>
          {roomId.slice(0, 8)}…
        </span>
      </div>

      {/* Controls */}
      <ControlButton
        id="btn-mute"
        icon={muted ? "🔇" : "🎤"}
        label={muted ? "Unmute" : "Mute"}
        active={!muted}
        onClick={handleMute}
      />
      <ControlButton
        id="btn-video"
        icon={videoOff ? "📷" : "📹"}
        label={videoOff ? "Start Video" : "Stop Video"}
        active={!videoOff}
        onClick={handleVideo}
      />
      <ControlButton
        id="btn-copy"
        icon={copied ? "✅" : "🔗"}
        label={copied ? "Copied!" : "Share"}
        onClick={handleCopy}
      />
      <ControlButton
        id="btn-end-call"
        icon="📞"
        label="End Call"
        danger
        onClick={onEndCall}
      />
    </div>
  );
}
