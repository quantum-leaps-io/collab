"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [roomInput, setRoomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleCreateRoom = () => {
    const id = Math.random().toString(36).slice(2, 9);
    router.push(`/room/${id}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomInput.trim();
    if (!trimmed) return;
    router.push(`/room/${trimmed}`);
  };

  if (authLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div
        style={{ textAlign: "center", marginBottom: 56 }}
        className="animate-fade-up"
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--accent) 0%, #7b5fff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 0 30px var(--accent-glow)",
            }}
          >
            📡
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              background: "linear-gradient(90deg, #fff 0%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
            }}
          >
            Collab
          </span>
        </div>
        <h1
          style={{
            fontSize: "clamp(32px, 6vw, 52px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
            color: "var(--text-primary)",
            marginBottom: 14,
          }}
        >
          Video calls that{" "}
          <span
            style={{
              background: "linear-gradient(90deg, var(--accent) 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            just work
          </span>
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--text-secondary)",
            maxWidth: 420,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Crystal-clear WebRTC video calls. No downloads, no accounts for
          guests — just share a link.
        </p>
      </div>

      {/* Card */}
      <div
        className="glass animate-fade-up"
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: "var(--radius-lg)",
          padding: "36px 32px",
          animationDelay: "0.1s",
        }}
      >
        {!user ? (
          /* ── Signed-out state ───────────────────────── */
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: 24,
                fontSize: 15,
              }}
            >
              Sign in to create or join a room
            </p>
            <button
              id="btn-google-signin"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 24px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: loading ? "var(--accent-dim)" : "var(--control-bg)",
                color: "var(--text-primary)",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--control-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  loading ? "var(--accent-dim)" : "var(--control-bg)";
              }}
            >
              {loading ? (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "2px solid var(--accent-dim)",
                    borderTopColor: "var(--accent)",
                    animation: "spin-slow 0.8s linear infinite",
                  }}
                />
              ) : (
                /* Google SVG icon */
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {loading ? "Signing in…" : "Continue with Google"}
            </button>
          </div>
        ) : (
          /* ── Signed-in state ────────────────────────── */
          <div>
            {/* User info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 28,
                padding: "12px 16px",
                background: "rgba(79,127,255,0.06)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(79,127,255,0.12)",
              }}
            >
              {user.photoURL && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  width={36}
                  height={36}
                  style={{ borderRadius: "50%", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.displayName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.email}
                </div>
              </div>
              <button
                id="btn-signout"
                onClick={handleSignOut}
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-secondary)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-muted)")
                }
              >
                Sign out
              </button>
            </div>

            {/* Create room */}
            <button
              id="btn-create-room"
              onClick={handleCreateRoom}
              style={{
                width: "100%",
                padding: "15px 24px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(79,127,255,0.35)",
                background: "linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.01em",
                transition: "all 0.18s ease",
                boxShadow: "0 4px 20px rgba(79,127,255,0.25)",
                marginBottom: 16,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 6px 30px rgba(79,127,255,0.45)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 20px rgba(79,127,255,0.25)")
              }
            >
              + Create New Room
            </button>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                or join existing
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Join room form */}
            <form
              id="form-join-room"
              onSubmit={handleJoinRoom}
              style={{ display: "flex", gap: 10 }}
            >
              <input
                id="input-room-id"
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Enter Room ID"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  fontFamily: "monospace",
                  outline: "none",
                  transition: "border-color 0.18s",
                }}
                onFocus={(e) =>
                  ((e.target as HTMLInputElement).style.borderColor =
                    "rgba(79,127,255,0.5)")
                }
                onBlur={(e) =>
                  ((e.target as HTMLInputElement).style.borderColor =
                    "var(--border)")
                }
              />
              <button
                id="btn-join-room"
                type="submit"
                style={{
                  padding: "12px 18px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(79,127,255,0.3)",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(79,127,255,0.25)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "var(--accent-dim)")
                }
              >
                Join →
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer features */}
      <div
        className="animate-fade-up"
        style={{
          marginTop: 40,
          display: "flex",
          gap: 24,
          fontSize: 13,
          color: "var(--text-muted)",
          animationDelay: "0.2s",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {["🔒 End-to-End Encrypted", "⚡ <100ms Latency", "🌐 No Download Needed"].map(
          (feat) => (
            <span key={feat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {feat}
            </span>
          )
        )}
      </div>
    </main>
  );
}
