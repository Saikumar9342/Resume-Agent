"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ShortcutOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { group: "AI", items: [
    { keys: ["Ctrl", "Enter"], label: "Run AI rewrite" },
    { keys: ["Ctrl", "K"], label: "Open command palette" },
    { keys: ["Ctrl", "H"], label: "Toggle heatmap" },
  ]},
  { group: "Navigation", items: [
    { keys: ["?"], label: "Show this overlay" },
    { keys: ["Esc"], label: "Close palette / overlay" },
    { keys: ["Ctrl", "S"], label: "Save (auto, just for reference)" },
  ]},
  { group: "Editor", items: [
    { keys: ["Click"], label: "Edit any field inline" },
    { keys: ["Enter"], label: "Confirm edit" },
    { keys: ["Esc"], label: "Cancel edit" },
  ]},
  { group: "ATS", items: [
    { keys: ["Auto"], label: "ATS re-runs 3s after any edit" },
    { keys: ["Click fix"], label: "Auto-fix issues with AI" },
  ]},
  { group: "Diff Review", items: [
    { keys: ["accept →"], label: "Accept individual patch" },
    { keys: ["accept all ↓"], label: "Accept all AI patches" },
    { keys: ["discard"], label: "Reject all patches" },
  ]},
];

export function ShortcutOverlay({ onClose }: ShortcutOverlayProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          width: 580,
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 22px 14px",
          borderBottom: "1px solid var(--line)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.02em" }}>Keyboard Shortcuts</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>Press ? or Esc to close</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-3)", border: "1px solid var(--line)",
              borderRadius: 6, width: 28, height: 28, cursor: "pointer",
              color: "var(--fg-2)", fontSize: 14, display: "grid", placeItems: "center",
            }}
          >×</button>
        </div>

        {/* Grid of groups */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 0, padding: "4px 0 8px",
        }}>
          {SHORTCUTS.map(group => (
            <div key={group.group} style={{ padding: "14px 22px" }}>
              <div className="mono" style={{
                fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em",
                color: "var(--accent)", marginBottom: 10, fontWeight: 700,
              }}>{group.group}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {group.items.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                  }}>
                    <span style={{ fontSize: 12, color: "var(--fg-1)" }}>{item.label}</span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {item.keys.map((k, j) => (
                        <span key={j} className="kbd mono" style={{
                          fontSize: 10.5, padding: "2px 7px", height: 20,
                          background: "var(--bg-3)", border: "1px solid var(--line)",
                          borderRadius: 4, color: "var(--fg-2)",
                          display: "inline-flex", alignItems: "center",
                          letterSpacing: "0.02em",
                        }}>{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "10px 22px 16px",
          borderTop: "1px solid var(--line)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
            Ctrl = Cmd on Mac
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
            More shortcuts via <span style={{
              background: "var(--bg-3)", border: "1px solid var(--line)",
              borderRadius: 4, padding: "1px 6px", color: "var(--fg-2)",
            }}>Ctrl+K</span>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
