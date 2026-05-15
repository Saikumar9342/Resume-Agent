"use client";

import { Icon, Dot } from "@/components/ui/Icon";
import { useAuthStore } from "@/store/authStore";

interface TopBarProps {
  resumeTitle?: string;
  onPalette: () => void;
  onRunAI: () => void;
  onStopAI?: () => void;
  onHistory: () => void;
  onExport: () => void;
  onBack: () => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  isDirty: boolean;
}

export function TopBar({ resumeTitle, onPalette, onRunAI, onStopAI, onHistory, onExport, onBack, aiState, isDirty }: TopBarProps) {
  const { user, clearAuth } = useAuthStore();
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 44,
      padding: "0 12px",
      background: "var(--bg-1)",
      borderBottom: "1px solid var(--line)",
      flexShrink: 0,
    }}>
      {/* Left: logo + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} title="back to landing" className="btn btn-ghost" style={{ height: 26, width: 26, padding: 0, justifyContent: "center", color: "var(--accent)" }}>
          <Icon name="logo" size={18} />
        </button>
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{ color: "var(--fg-2)" }}>~/resumes</span>
          <span style={{ color: "var(--fg-4)" }}>/</span>
          <span style={{ color: resumeTitle ? "var(--fg-1)" : "var(--fg-3)" }}>
            {resumeTitle ?? "untitled.resume"}
          </span>
        </div>
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-3)" }}>
          {isDirty ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--amber)", display: "inline-block" }} />
              <span>saving…</span>
            </>
          ) : (
            <>
              <Dot tone="green" />
              <span>saved</span>
            </>
          )}
        </div>
      </div>

      {/* Center: command bar trigger */}
      <button
        onClick={onPalette}
        className="mono"
        style={{
          height: 28, width: 320,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 10px",
          background: "var(--bg-0)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          color: "var(--fg-3)",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="search" size={12} />
          <span>Search files, jump, run commands…</span>
        </span>
        <span style={{ display: "flex", gap: 4 }}>
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      {/* Right: action buttons */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {user && (
          <>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </span>
            <button onClick={clearAuth} className="btn btn-ghost mono" title="Sign out">
              <Icon name="x" size={11} /> sign out
            </button>
          </>
        )}
        <button onClick={onExport} className="btn btn-ghost mono">
          <Icon name="download" size={11} /> export
        </button>
        <button onClick={onHistory} className="btn mono" style={{ background: "var(--bg-2)" }}>
          <Icon name="clock" size={11} /> history
        </button>
        {aiState === "streaming" ? (
          <button
            onClick={onStopAI}
            className="btn mono"
            style={{ background: "var(--bg-2)", color: "var(--fg-2)", border: "1px solid var(--line)" }}
          >
            <Icon name="x" size={11} /> stop
          </button>
        ) : null}
        <button
          onClick={onRunAI}
          disabled={aiState === "streaming"}
          className="btn btn-accent mono"
          style={{ opacity: aiState === "streaming" ? 0.5 : 1 }}
        >
          <Icon name="sparkle" size={11} />
          {aiState === "streaming" ? "rewriting…" : "rewrite"}
          <span className="kbd" style={{
            borderColor: "color-mix(in oklch, var(--bg-0) 50%, transparent)",
            color: "var(--bg-0)",
            background: "color-mix(in oklch, var(--bg-0) 18%, var(--accent))",
          }}>⌘↵</span>
        </button>
      </div>
    </header>
  );
}
