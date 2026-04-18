"use client";

import { useState } from "react";
import { signInAnonymously, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function GuestJoin() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setLoading(true);
    setError(null);

    try {
      // Sign in anonymously
      const { user } = await signInAnonymously(auth);
      
      // Update the user's profile with their display name
      await updateProfile(user, { displayName: trimmedName });
      
      // onAuthStateChanged in RoomContent will pick this up automatically
    } catch (err: unknown) {
      console.error("[GuestJoin] Failed to join:", err);
      setError("Failed to join room. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark)",
        padding: 24,
      }}
    >
      <div
        className="glass animate-fade-up"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "40px 32px",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--accent) 0%, #7b5fff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 24,
            boxShadow: "0 0 30px var(--accent-glow)",
          }}
        >
          👋
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Join the Call
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 15,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Enter your name to jump into the room as a guest.
        </p>

        <form onSubmit={handleJoin} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            maxLength={30}
            required
            style={{
              width: "100%",
              padding: "16px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--text-primary)",
              fontSize: 16,
              outline: "none",
              transition: "all 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />

          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: loading || !name.trim() ? "var(--border)" : "linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)",
              color: loading || !name.trim() ? "var(--text-muted)" : "white",
              fontSize: 16,
              fontWeight: 700,
              cursor: loading || !name.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Joining..." : "Join Now"}
          </button>
        </form>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: 14, marginTop: 16 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
