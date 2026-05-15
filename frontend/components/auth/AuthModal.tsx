"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

interface AuthModalProps {
  onSuccess: () => void;
}

type Mode = "login" | "register";

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = mode === "login"
        ? await api.login(email, password)
        : await api.register(email, password, fullName || undefined);
      setAuth(res.user, res.access_token);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      // Parse FastAPI detail from "API 4xx: {"detail":"..."}"
      const match = msg.match(/"detail":"([^"]+)"/);
      setError(match ? match[1] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "color-mix(in oklch, var(--bg-0) 70%, transparent)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 420,
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        boxShadow: "0 40px 80px -20px black, 0 0 0 1px var(--accent-line)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg-2)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ color: "var(--accent)" }}><Icon name="logo" size={20} /></span>
          <div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)" }}>
              resume-agent
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
              {mode === "login" ? "sign in to continue" : "create your account"}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
          {(["login", "register"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="mono"
              style={{
                flex: 1, height: 36, fontSize: 12,
                background: mode === m ? "var(--bg-0)" : "transparent",
                color: mode === m ? "var(--fg-0)" : "var(--fg-3)",
                border: 0, cursor: "pointer",
                borderBottom: mode === m ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {m === "login" ? "sign in" : "register"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <Field
              label="full name"
              type="text"
              value={fullName}
              onChange={setFullName}
              placeholder="Jane Smith"
              required={false}
            />
          )}
          <Field
            label="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            required
          />
          <Field
            label="password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={mode === "register" ? "min 8 characters" : "••••••••"}
            required
          />

          {error && (
            <div className="mono" style={{
              fontSize: 11, color: "var(--red)",
              background: "var(--red-soft)",
              border: "1px solid color-mix(in oklch, var(--red) 30%, transparent)",
              borderRadius: 6, padding: "8px 10px",
            }}>
              ✗ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent mono"
            style={{ height: 36, fontSize: 12, marginTop: 4, justifyContent: "center" }}
          >
            {loading
              ? <><Spinner /> {mode === "login" ? "signing in…" : "creating account…"}</>
              : mode === "login" ? "sign in →" : "create account →"
            }
          </button>
        </form>

        {/* Footer */}
        <div className="mono" style={{
          padding: "12px 24px",
          borderTop: "1px solid var(--line)",
          fontSize: 11, color: "var(--fg-3)",
          background: "var(--bg-2)",
        }}>
          Your data is private and scoped to your account only.
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, required }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mono"
        style={{
          height: 36, padding: "0 10px",
          background: "var(--bg-0)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          fontSize: 13, color: "var(--fg-0)",
        }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12,
      border: "2px solid var(--bg-0)",
      borderTopColor: "transparent",
      borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}
