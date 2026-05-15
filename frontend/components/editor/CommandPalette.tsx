"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { modKey } from "@/lib/keys";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  group: string;
}

interface CommandPaletteProps {
  onClose: () => void;
  onCommand: (id: string) => void;
}

export function CommandPalette({ onClose, onCommand }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mod = modKey();
  const COMMANDS = useMemo<Command[]>(() => [
    { id: "ai.rewrite",      label: "Run AI rewrite",          shortcut: `${mod}+Enter`, group: "AI" },
    { id: "ats.run",         label: "Re-run ATS analysis",     shortcut: `${mod}+A`,     group: "AI" },
    { id: "ats.heatmap",     label: "Toggle ATS heatmap",      shortcut: `${mod}+H`,     group: "View" },
    { id: "view.versions",   label: "Show version history",    shortcut: `${mod}+Y`,     group: "View" },
    { id: "cover.letter",    label: "Generate cover letter",   shortcut: "",             group: "AI" },
    { id: "section.summary", label: "Jump to: Summary",        shortcut: "1",            group: "Navigation" },
    { id: "section.exp",     label: "Jump to: Experience",     shortcut: "2",            group: "Navigation" },
    { id: "section.edu",     label: "Jump to: Education",      shortcut: "3",            group: "Navigation" },
    { id: "section.skills",  label: "Jump to: Skills",         shortcut: "4",            group: "Navigation" },
    { id: "export.pdf",      label: "Export / Print resume",   shortcut: `${mod}+E`,     group: "File" },
    { id: "theme.toggle",    label: "Toggle dark/light theme", shortcut: `${mod}+J`,     group: "View" },
  ], [mod]);

  const filtered = COMMANDS.filter(c =>
    !q || c.label.toLowerCase().includes(q.toLowerCase()) || c.group.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setHi(0); }, [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(filtered.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { if (filtered[hi]) onCommand(filtered[hi].id); }
    else if (e.key === "Escape") onClose();
  };

  // Group
  const grouped = filtered.reduce<Record<string, Array<Command & { idx: number }>>>((acc, c, idx) => {
    acc[c.group] = acc[c.group] || [];
    acc[c.group].push({ ...c, idx });
    return acc;
  }, {});

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "color-mix(in oklch, var(--bg-0) 60%, transparent)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "15vh",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 600, maxWidth: "90vw",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          boxShadow: "0 40px 80px -20px black, 0 0 0 1px var(--accent-line)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg-2)",
        }}>
          <Icon name="search" size={16} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="mono"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search files, jump, run commands…"
            style={{ flex: 1, fontSize: 13, color: "var(--fg-0)", background: "transparent" }}
          />
          <span className="kbd">Esc</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflow: "auto", padding: "8px 0" }}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="mono" style={{
                fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase",
                letterSpacing: "0.08em", padding: "6px 16px 4px",
              }}>{group}</div>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => onCommand(item.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 16px",
                    background: item.idx === hi ? "var(--bg-3)" : "transparent",
                    border: 0, cursor: "pointer",
                    color: item.idx === hi ? "var(--fg-0)" : "var(--fg-1)",
                  }}
                  onMouseEnter={() => setHi(item.idx)}
                >
                  <span style={{ fontSize: 13 }}>{item.label}</span>
                  {item.shortcut && (
                    <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{item.shortcut}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              No commands match "{q}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
