"use client";

import { useState, useRef } from "react";
import { Icon, Dot } from "@/components/ui/Icon";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { modKey } from "@/lib/keys";

interface TopBarProps {
  resumeTitle?: string;
  onTitleChange?: (title: string) => void;
  onPalette: () => void;
  onRunAI: () => void;
  onStopAI?: () => void;
  onHistory: () => void;
  onExport: () => void;
  onShare?: () => void;
  onBack: () => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  isDirty: boolean;
}

export function TopBar({ resumeTitle, onTitleChange, onPalette, onRunAI, onStopAI, onHistory, onExport, onShare, onBack, aiState, isDirty }: TopBarProps) {
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const mod = modKey();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  return (
    <header style={{
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      height: 46,
      padding: "0 16px",
      background: "var(--bg-1)",
      borderBottom: "1px solid var(--line)",
      flexShrink: 0,
      gap: 12,
    }}>

      {/* Left: logo + breadcrumb + save state */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button
          onClick={onBack}
          title="Back to home"
          className="btn btn-ghost"
          style={{ height: 28, width: 28, padding: 0, justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}
        >
          <Icon name="logo" size={16} />
        </button>

        <div style={{ width: 1, height: 16, background: "var(--line)", flexShrink: 0 }} />

        {/* Breadcrumb */}
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, minWidth: 0 }}>
          <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>resumes</span>
          <span style={{ color: "var(--fg-4)" }}>/</span>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (titleDraft.trim()) onTitleChange?.(titleDraft.trim());
              }}
              onKeyDown={e => {
                if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
                if (e.key === "Escape") { setEditingTitle(false); }
              }}
              style={{
                background: "var(--bg-0)", border: "1px solid var(--accent)",
                borderRadius: 4, color: "var(--fg-0)", fontSize: 12,
                fontFamily: "var(--mono)", padding: "2px 6px", width: 160, outline: "none",
              }}
              autoFocus
            />
          ) : (
            <span
              title="Click to rename"
              onClick={() => { setTitleDraft(resumeTitle ?? ""); setEditingTitle(true); }}
              style={{
                color: resumeTitle ? "var(--fg-0)" : "var(--fg-3)",
                cursor: "text",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 180,
              }}
            >
              {resumeTitle ?? "untitled.resume"}
            </span>
          )}
        </div>

        {/* Save indicator */}
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-4)", flexShrink: 0 }}>
          {isDirty ? (
            <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--amber)", display: "inline-block" }} />
          ) : (
            <Dot tone="green" />
          )}
        </div>
      </div>

      {/* Center: command palette trigger */}
      <button
        onClick={onPalette}
        className="mono"
        style={{
          height: 30, width: 300,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 10px",
          background: "var(--bg-0)",
          border: "1px solid var(--line)",
          borderRadius: 7,
          color: "var(--fg-4)",
          fontSize: 11.5,
          cursor: "pointer",
          gap: 8,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="search" size={11} />
          <span style={{ whiteSpace: "nowrap" }}>Search or run a command…</span>
        </span>
        <span style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          <span className="kbd">{mod}</span>
          <span className="kbd">K</span>
        </span>
      </button>

      {/* Right: grouped actions */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>

        {/* Secondary actions group */}
        <div style={{ display: "flex", gap: 2, alignItems: "center", padding: "0 4px", borderRight: "1px solid var(--line)" }}>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            title="Toggle theme (Ctrl+J)"
            style={{ width: 30, height: 30, padding: 0, justifyContent: "center", fontSize: 14 }}
          >
            {theme === "dark" ? "☀" : "◑"}
          </button>
          {onShare && (
            <button onClick={onShare} className="btn btn-ghost mono" title="Share resume" style={{ height: 30, fontSize: 11.5 }}>
              <Icon name="branch" size={11} /> share
            </button>
          )}
          <button onClick={onExport} className="btn btn-ghost mono" style={{ height: 30, fontSize: 11.5 }}>
            <Icon name="download" size={11} /> export
          </button>
          <button onClick={onHistory} className="btn btn-ghost mono" style={{ height: 30, fontSize: 11.5 }}>
            <Icon name="clock" size={11} /> history
          </button>
        </div>

        {/* AI action */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {aiState === "streaming" && (
            <button
              onClick={onStopAI}
              className="btn mono"
              style={{ height: 30, fontSize: 11.5, background: "var(--bg-2)", color: "var(--fg-2)", border: "1px solid var(--line)" }}
            >
              <Icon name="x" size={11} /> stop
            </button>
          )}
          <button
            onClick={onRunAI}
            disabled={aiState === "streaming"}
            className="btn btn-accent mono"
            style={{ height: 30, fontSize: 12, opacity: aiState === "streaming" ? 0.5 : 1 }}
          >
            <Icon name="sparkle" size={12} />
            {aiState === "streaming" ? "rewriting…" : "rewrite"}
            <span className="kbd" style={{
              borderColor: "color-mix(in oklch, var(--bg-0) 50%, transparent)",
              color: "var(--bg-0)",
              background: "color-mix(in oklch, var(--bg-0) 18%, var(--accent))",
            }}>{mod}↵</span>
          </button>
        </div>

        {/* User */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 8, borderLeft: "1px solid var(--line)" }}>
            <div style={{
              width: 26, height: 26, borderRadius: 99,
              background: "var(--accent)", color: "var(--bg-0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}>
              {user.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <button
              onClick={clearAuth}
              className="btn btn-ghost mono"
              title="Sign out"
              style={{ height: 28, fontSize: 11, color: "var(--fg-3)" }}
            >
              sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
