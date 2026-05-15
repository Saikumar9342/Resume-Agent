"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { FontSize, EditorLayout, AIModel } from "@/store/settingsStore";
import { api } from "@/lib/api";

type SettingsTab = "profile" | "preferences" | "editor" | "ai" | "notifications" | "data";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",        icon: "user" },
  { id: "preferences",   label: "Preferences",    icon: "settings" },
  { id: "editor",        label: "Editor",         icon: "doc" },
  { id: "ai",            label: "AI & Models",    icon: "sparkle" },
  { id: "notifications", label: "Notifications",  icon: "bolt" },
  { id: "data",          label: "Data & Export",  icon: "download" },
];

/* ── helpers ── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 99, border: 0, cursor: "pointer",
        background: on ? "var(--accent)" : "var(--bg-3)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: 99,
        background: "var(--bg-0)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <div>
        <div className="mono" style={{ fontSize: 12.5, color: "var(--fg-1)" }}>{label}</div>
        {hint && <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 10, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 20, marginBottom: 4 }}>
      {children}
    </div>
  );
}

function SegControl<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", background: "var(--bg-3)", borderRadius: 6, padding: 2, gap: 2 }}>
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className="mono"
          style={{
            height: 24, padding: "0 10px", borderRadius: 4, border: 0, cursor: "pointer", fontSize: 11,
            background: value === o.v ? "var(--bg-1)" : "transparent",
            color: value === o.v ? "var(--fg-0)" : "var(--fg-3)",
            fontWeight: value === o.v ? 600 : 400,
            transition: "background 0.15s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── tab panes ── */

function ProfilePane() {
  const { user, setAuth, token } = useAuthStore();
  const [name, setName] = useState(user?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user || !token) return;
    setSaving(true);
    try {
      // Optimistic update — persist to store
      setAuth({ ...user, full_name: name.trim() || undefined }, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 99,
          background: "var(--accent)", color: "var(--bg-0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700,
        }}>
          {(name || user?.email || "U")[0].toUpperCase()}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 14, color: "var(--fg-0)", fontWeight: 600 }}>{name || user?.email?.split("@")[0] || "User"}</div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>{user?.email}</div>
        </div>
      </div>

      <SectionHead>personal info</SectionHead>
      <Row label="Display name" hint="Shown in the UI and on shared resumes">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          style={{
            background: "var(--bg-0)", border: "1px solid var(--line)", borderRadius: 6,
            color: "var(--fg-0)", fontSize: 12, fontFamily: "var(--mono)",
            padding: "5px 10px", width: 180, outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--accent)")}
          onBlur={e => (e.target.style.borderColor = "var(--line)")}
        />
      </Row>
      <Row label="Email" hint="Cannot be changed">
        <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{user?.email}</span>
      </Row>

      <SectionHead>account</SectionHead>
      <Row label="Account type" hint="Current plan">
        <span className="mono" style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 8px", borderRadius: 4 }}>Free</span>
      </Row>
      <Row label="Member since" hint="">
        <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>2025</span>
      </Row>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-accent mono"
          style={{ height: 32, fontSize: 12 }}
        >
          {saved ? <><Icon name="check" size={12} /> saved</> : saving ? "saving…" : "save changes"}
        </button>
      </div>
    </div>
  );
}

function PreferencesPane() {
  const { theme, toggleTheme } = useThemeStore();
  const { showHeatmap, autoSave, setShowHeatmap, setAutoSave } = useSettingsStore();

  return (
    <div>
      <SectionHead>appearance</SectionHead>
      <Row label="Theme" hint="Switch between dark and light mode">
        <SegControl<"dark" | "light">
          value={theme}
          options={[{ v: "dark", label: "Dark" }, { v: "light", label: "Light" }]}
          onChange={() => toggleTheme()}
        />
      </Row>

      <SectionHead>behaviour</SectionHead>
      <Row label="Section heatmap" hint="Color-coded quality indicators on sidebar">
        <Toggle on={showHeatmap} onChange={setShowHeatmap} />
      </Row>
      <Row label="Auto-save" hint="Save changes automatically as you edit">
        <Toggle on={autoSave} onChange={setAutoSave} />
      </Row>
    </div>
  );
}

function EditorPane() {
  const { fontSize, editorLayout, setFontSize, setEditorLayout } = useSettingsStore();

  return (
    <div>
      <SectionHead>typography</SectionHead>
      <Row label="Editor font size" hint="Size of text in the editor panels">
        <SegControl<FontSize>
          value={fontSize}
          options={[{ v: "sm", label: "Small" }, { v: "md", label: "Medium" }, { v: "lg", label: "Large" }]}
          onChange={setFontSize}
        />
      </Row>

      <SectionHead>layout</SectionHead>
      <Row label="Editor layout" hint="How panels are arranged on screen">
        <SegControl<EditorLayout>
          value={editorLayout}
          options={[{ v: "split", label: "Split" }, { v: "wide", label: "Wide" }, { v: "focus", label: "Focus" }]}
          onChange={setEditorLayout}
        />
      </Row>

      <div style={{ marginTop: 20, padding: 12, background: "var(--bg-3)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
          More editor options coming soon — keybindings, ruler, minimap, and vim mode.
        </div>
      </div>
    </div>
  );
}

function AIPane() {
  const { preferredModel, streamingEnabled, setPreferredModel, setStreamingEnabled } = useSettingsStore();

  const models: { v: AIModel; label: string; desc: string; badge?: string }[] = [
    { v: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "Best quality rewrites, slower", badge: "recommended" },
    { v: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", desc: "Faster, lighter edits", },
  ];

  return (
    <div>
      <SectionHead>model</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {models.map(m => (
          <button
            key={m.v}
            onClick={() => setPreferredModel(m.v)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              background: preferredModel === m.v ? "var(--accent-soft)" : "var(--bg-3)",
              border: `1.5px solid ${preferredModel === m.v ? "var(--accent)" : "var(--line)"}`,
              borderRadius: 8, cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 99, border: `2px solid ${preferredModel === m.v ? "var(--accent)" : "var(--line)"}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {preferredModel === m.v && <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent)", display: "block" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 12, color: "var(--fg-0)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                {m.label}
                {m.badge && <span style={{ fontSize: 9.5, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 3 }}>{m.badge}</span>}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <SectionHead>streaming</SectionHead>
      <Row label="Stream AI output" hint="Show tokens as they arrive instead of waiting for the full result">
        <Toggle on={streamingEnabled} onChange={setStreamingEnabled} />
      </Row>
    </div>
  );
}

function NotificationsPane() {
  const { notifyOnSave, notifyOnATS, setNotifyOnSave, setNotifyOnATS } = useSettingsStore();

  return (
    <div>
      <SectionHead>in-app alerts</SectionHead>
      <Row label="Save confirmation" hint="Show a toast when resume is saved">
        <Toggle on={notifyOnSave} onChange={setNotifyOnSave} />
      </Row>
      <Row label="ATS score alerts" hint="Notify when ATS score changes significantly">
        <Toggle on={notifyOnATS} onChange={setNotifyOnATS} />
      </Row>

      <div style={{ marginTop: 20, padding: 12, background: "var(--bg-3)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
          Email and push notifications are coming in a future update.
        </div>
      </div>
    </div>
  );
}

function DataPane() {
  const { user } = useAuthStore();
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const resumes = await api.listResumes();
      const blob = new Blob([JSON.stringify(resumes, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumes-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2500);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <SectionHead>export</SectionHead>
      <Row label="Export all resumes" hint="Download all your resumes as a JSON file">
        <button
          onClick={handleExportAll}
          disabled={exporting}
          className="btn btn-ghost mono"
          style={{ height: 30, fontSize: 11.5 }}
        >
          <Icon name="download" size={11} />
          {exportDone ? "downloaded!" : exporting ? "exporting…" : "export JSON"}
        </button>
      </Row>

      <SectionHead>account data</SectionHead>
      <Row label="Your account" hint="Logged in as">
        <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{user?.email}</span>
      </Row>

      <div style={{ marginTop: 24, padding: 14, background: "color-mix(in oklch, var(--red) 8%, var(--bg-0))", border: "1px solid color-mix(in oklch, var(--red) 25%, transparent)", borderRadius: 8 }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, marginBottom: 4 }}>Danger zone</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 10 }}>Deleting your account is permanent and cannot be undone.</div>
        <button
          className="btn mono"
          style={{ height: 30, fontSize: 11.5, border: "1px solid var(--red)", color: "var(--red)", background: "transparent" }}
          onClick={() => alert("Account deletion is not yet available. Contact support.")}
        >
          Delete account
        </button>
      </div>
    </div>
  );
}

/* ── main modal ── */

export function SettingsModal({ open, onClose, initialTab = "profile" }: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const pane = tab === "profile"       ? <ProfilePane />
             : tab === "preferences"   ? <PreferencesPane />
             : tab === "editor"        ? <EditorPane />
             : tab === "ai"            ? <AIPane />
             : tab === "notifications" ? <NotificationsPane />
             : <DataPane />;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 680, height: 480,
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        display: "flex",
        overflow: "hidden",
        boxShadow: "0 24px 64px -16px rgba(0,0,0,0.6)",
      }}>
        {/* Sidebar */}
        <div style={{
          width: 180, background: "var(--bg-0)", borderRight: "1px solid var(--line)",
          display: "flex", flexDirection: "column", padding: "16px 0",
          flexShrink: 0,
        }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 16px 12px" }}>
            settings
          </div>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="mono"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 16px", border: 0, cursor: "pointer", textAlign: "left",
                background: tab === t.id ? "var(--bg-3)" : "transparent",
                color: tab === t.id ? "var(--fg-0)" : "var(--fg-3)",
                fontSize: 12.5, fontWeight: tab === t.id ? 600 : 400,
                borderLeft: `2px solid ${tab === t.id ? "var(--accent)" : "transparent"}`,
                transition: "background 0.1s",
              }}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Header */}
          <div style={{
            height: 50, display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", borderBottom: "1px solid var(--line)", flexShrink: 0,
          }}>
            <span className="mono" style={{ fontSize: 14, color: "var(--fg-0)", fontWeight: 600 }}>
              {TABS.find(t => t.id === tab)?.label}
            </span>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>

          {/* Pane */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
            {pane}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
