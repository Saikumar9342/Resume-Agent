"use client";

import { useState, useRef, useEffect } from "react";
import { Icon, Dot } from "@/components/ui/Icon";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { modKey } from "@/lib/keys";
import { SettingsModal } from "@/components/editor/SettingsModal";
import type { } from "@/store/settingsStore";

interface TopBarProps {
  resumeTitle?: string;
  onTitleChange?: (title: string) => void;
  onPalette: () => void;
  onRunAI: () => void;
  onStopAI?: () => void;
  onHistory?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onBack: () => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  isDirty: boolean;
}

type SettingsTab = "profile" | "preferences" | "editor" | "ai" | "notifications" | "data";

function UserMenu({ user, clearAuth, theme, toggleTheme }: {
  user: { email: string; full_name?: string } | null;
  clearAuth: () => void;
  theme: string;
  toggleTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const openSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
    setOpen(false);
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";
  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const email = user?.email ?? "";

  return (
    <>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab={settingsTab} />

      <div ref={ref} style={{ position: "relative" }}>
        {/* Avatar trigger */}
        <button
          onClick={() => setOpen(v => !v)}
          title={email}
          style={{
            width: 30, height: 30, borderRadius: 99,
            background: open ? "var(--accent)" : "var(--bg-3)",
            color: open ? "var(--bg-0)" : "var(--accent)",
            border: `1.5px solid ${open ? "var(--accent)" : "var(--line)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
            flexShrink: 0,
          }}
        >
          {initial}
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 230,
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)",
            zIndex: 100,
            overflow: "hidden",
          }}>
            {/* User header */}
            <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 99, flexShrink: 0,
                background: "var(--accent)", color: "var(--bg-0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700,
              }}>
                {initial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--fg-0)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {email}
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: "6px 0" }}>
              <DItem icon="user"     label="Profile"       onClick={() => openSettings("profile")} />
              <DItem icon="settings" label="Preferences"   onClick={() => openSettings("preferences")} />
              <DItem icon="doc"      label="Editor"        onClick={() => openSettings("editor")} />
              <DItem icon="sparkle"  label="AI & Models"   onClick={() => openSettings("ai")} />
              <DItem icon="bolt"     label="Notifications" onClick={() => openSettings("notifications")} />
              <DItem icon="download" label="Data & Export" onClick={() => openSettings("data")} />

              <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />

              {/* Theme toggle inline */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px" }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>
                  {theme === "dark" ? "Dark mode" : "Light mode"}
                </span>
                <button
                  onClick={toggleTheme}
                  style={{
                    width: 36, height: 20, borderRadius: 99, border: 0, cursor: "pointer",
                    background: theme === "dark" ? "var(--accent)" : "var(--bg-3)",
                    position: "relative", transition: "background 0.2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: theme === "dark" ? 18 : 2,
                    width: 16, height: 16, borderRadius: 99,
                    background: "var(--bg-0)", transition: "left 0.2s",
                  }} />
                </button>
              </div>

              <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />

              <DItem icon="x" label="Sign out" onClick={() => { clearAuth(); setOpen(false); }} danger />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="mono"
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9,
        padding: "7px 14px", border: 0, background: "transparent",
        color: danger ? "var(--red)" : "var(--fg-1)",
        fontSize: 12, cursor: "pointer", textAlign: "left",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <Icon name={icon} size={13} style={{ color: danger ? "var(--red)" : "var(--fg-3)" }} />
      {label}
    </button>
  );
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
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
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

      {/* Right: only user avatar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <UserMenu user={user} clearAuth={clearAuth} theme={theme} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
}

/* ── Floating action bar — rendered inside the canvas area ── */
interface FloatingActionsProps {
  onRunAI: () => void;
  onStopAI?: () => void;
  onExport: () => void;
  onExportDocx?: () => void;
  onShare?: () => void;
  onHistory: () => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
}

export function FloatingActions({ onRunAI, onStopAI, onExport, onExportDocx, onShare, onHistory, aiState }: FloatingActionsProps) {
  const mod = modKey();

  return (
    <div style={{
      position: "absolute", bottom: 20, right: 20, zIndex: 20,
      display: "flex", alignItems: "center", gap: 6,
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 12,
      padding: "5px 8px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
      backdropFilter: "blur(8px)",
    }}>
      {/* Secondary actions */}
      {onShare && (
        <FloatBtn icon="branch" label="share" onClick={onShare} />
      )}
      <FloatBtn icon="download" label="pdf" onClick={onExport} />
      {onExportDocx && <FloatBtn icon="doc" label=".docx" onClick={onExportDocx} />}
      <FloatBtn icon="clock" label="history" onClick={onHistory} />

      <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 2px" }} />

      {/* Stop button when streaming */}
      {aiState === "streaming" && (
        <button
          onClick={onStopAI}
          className="btn mono"
          style={{ height: 30, fontSize: 11.5, background: "var(--bg-2)", color: "var(--fg-2)", border: "1px solid var(--line)", borderRadius: 7 }}
        >
          <Icon name="x" size={11} /> stop
        </button>
      )}

      {/* Primary AI rewrite */}
      <button
        onClick={onRunAI}
        disabled={aiState === "streaming"}
        className="btn btn-accent mono"
        style={{ height: 30, fontSize: 12, borderRadius: 8, opacity: aiState === "streaming" ? 0.5 : 1 }}
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
  );
}

function FloatBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-ghost mono"
      style={{ height: 30, fontSize: 11.5, borderRadius: 7 }}
      title={label}
    >
      <Icon name={icon} size={11} /> {label}
    </button>
  );
}
