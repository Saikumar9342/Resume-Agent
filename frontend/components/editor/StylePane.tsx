"use client";

import { useState } from "react";
import type { ResumeStyle } from "@/types/resume";
import { DEFAULT_STYLE } from "@/types/resume";

interface StylePaneProps {
  style: ResumeStyle;
  onChange: (s: ResumeStyle) => void;
  resumeRole?: string;
}

const FONTS = [
  { label: "Inter",            value: "Inter, sans-serif" },
  { label: "Georgia (Serif)",  value: "Georgia, 'Times New Roman', serif" },
  { label: "Palatino",         value: "'Palatino Linotype', Palatino, Georgia, serif" },
  { label: "Roboto",           value: "'Roboto', Arial, sans-serif" },
  { label: "Merriweather",     value: "'Merriweather', Georgia, serif" },
  { label: "Lato",             value: "'Lato', Arial, sans-serif" },
  { label: "Source Sans",      value: "'Source Sans 3', Arial, sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
];

const ACCENT_PRESETS = [
  "#1a56db", "#0e7c5a", "#7c3aed", "#b91c1c", "#c2760a",
  "#0f7490", "#374151", "#be185d", "#1d4ed8", "#047857",
];

const QUICK_PROMPTS = [
  { label: "Tech startup",      prompt: "modern tech startup, engineering role" },
  { label: "Finance / law",     prompt: "finance or law firm, formal conservative" },
  { label: "Creative / design", prompt: "creative agency or design field" },
  { label: "Healthcare",        prompt: "healthcare or medical field" },
  { label: "Academia",          prompt: "academic or research position" },
  { label: "Executive",         prompt: "senior executive or C-suite, premium feel" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
      <label className="mono" style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Slider({ min, max, step, value, onChange, unit = "" }: {
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "var(--accent)" }}
      />
      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-2)", minWidth: 32, textAlign: "right" }}>
        {value}{unit}
      </span>
    </div>
  );
}

export function StylePane({ style, onChange, resumeRole }: StylePaneProps) {
  const set = <K extends keyof ResumeStyle>(key: K, val: ResumeStyle[K]) =>
    onChange({ ...style, [key]: val });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const askAI = async (promptOverride?: string) => {
    const p = promptOverride ?? aiPrompt;
    if (!p.trim()) return;
    setAiLoading(true); setAiReasoning(null); setAiError(null);
    try {
      const token = JSON.parse(localStorage.getItem("resume-agent-auth") ?? "{}").state?.token ?? "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/style-advisor`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ prompt: p, role: resumeRole ?? "" }),
        }
      );
      const data = await res.json();
      if (data.error) { setAiError(data.error); return; }
      // Apply all style keys returned by AI, skip unknown keys
      const styleKeys: (keyof ResumeStyle)[] = [
        "fontFamily","accentColor","headingColor","bodyColor",
        "fontSize","lineHeight","sectionSpacing","pageMargin",
      ];
      const next = { ...style };
      for (const k of styleKeys) {
        if (data[k] !== undefined) (next as any)[k] = data[k];
      }
      onChange(next);
      if (data.reasoning) setAiReasoning(data.reasoning);
    } catch {
      setAiError("Failed to get recommendation. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── AI Style Advisor ── */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          ✦ AI style advisor
        </div>

        {/* Quick prompt chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {QUICK_PROMPTS.map(q => (
            <button
              key={q.label}
              onClick={() => { setAiPrompt(q.prompt); askAI(q.prompt); }}
              disabled={aiLoading}
              className="mono"
              style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 4,
                background: "var(--bg-2)", border: "1px solid var(--line)",
                color: "var(--fg-2)", cursor: "pointer",
                opacity: aiLoading ? 0.5 : 1,
              }}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Freeform input */}
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") askAI(); }}
            placeholder="e.g. senior lawyer at NYC firm…"
            className="mono"
            style={{
              flex: 1, background: "var(--bg-2)", border: "1px solid var(--line)",
              borderRadius: 5, padding: "6px 9px", fontSize: 11.5,
              color: "var(--fg-0)", outline: "none",
            }}
          />
          <button
            onClick={() => askAI()}
            disabled={aiLoading || !aiPrompt.trim()}
            className="btn btn-accent mono"
            style={{ height: 32, padding: "0 12px", fontSize: 11, flexShrink: 0 }}
          >
            {aiLoading ? "…" : "ask"}
          </button>
        </div>

        {/* AI reasoning */}
        {aiReasoning && (
          <div style={{
            marginTop: 8, padding: "7px 10px",
            background: "color-mix(in oklch, var(--accent) 6%, var(--bg-1))",
            border: "1px solid color-mix(in oklch, var(--accent) 20%, transparent)",
            borderRadius: 6, fontSize: 11.5, color: "var(--fg-1)", lineHeight: 1.5,
          }}>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 6 }}>
              AI
            </span>
            {aiReasoning}
          </div>
        )}
        {aiError && (
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--red)" }} className="mono">{aiError}</div>
        )}
      </div>

      {/* ── Manual controls ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          manual customizer
        </div>

        {/* Font Family */}
        <Row label="Font family">
          <select
            value={style.fontFamily}
            onChange={e => set("fontFamily", e.target.value)}
            className="mono"
            style={{
              background: "var(--bg-2)", border: "1px solid var(--line)",
              borderRadius: 5, padding: "6px 8px", fontSize: 11.5,
              color: "var(--fg-0)", width: "100%", cursor: "pointer",
            }}
          >
            {FONTS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <div style={{ fontFamily: style.fontFamily, fontSize: 12.5, color: "var(--fg-1)", padding: "6px 8px", background: "var(--bg-2)", borderRadius: 5, border: "1px solid var(--line-soft)" }}>
            The quick brown fox jumps over the lazy dog
          </div>
        </Row>

        {/* Accent Color */}
        <Row label="Accent color">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
            {ACCENT_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => set("accentColor", c)}
                style={{
                  width: 22, height: 22, borderRadius: 5, background: c,
                  border: style.accentColor === c ? "2px solid var(--fg-0)" : "2px solid transparent",
                  cursor: "pointer", flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={style.accentColor}
              onChange={e => set("accentColor", e.target.value)}
              style={{ width: 34, height: 26, borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer", padding: 2 }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{style.accentColor}</span>
          </div>
        </Row>

        <Row label="Heading color">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={style.headingColor} onChange={e => set("headingColor", e.target.value)}
              style={{ width: 34, height: 26, borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer", padding: 2 }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{style.headingColor}</span>
          </div>
        </Row>

        <Row label="Body text color">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={style.bodyColor} onChange={e => set("bodyColor", e.target.value)}
              style={{ width: 34, height: 26, borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer", padding: 2 }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{style.bodyColor}</span>
          </div>
        </Row>

        <Row label={`Font size — ${style.fontSize}px`}>
          <Slider min={9} max={14} step={0.5} value={style.fontSize} onChange={v => set("fontSize", v)} unit="px" />
        </Row>

        <Row label={`Line height — ${style.lineHeight}`}>
          <Slider min={1.2} max={2.0} step={0.05} value={style.lineHeight} onChange={v => set("lineHeight", v)} />
        </Row>

        <Row label={`Section spacing — ${style.sectionSpacing}px`}>
          <Slider min={8} max={36} step={2} value={style.sectionSpacing} onChange={v => set("sectionSpacing", v)} unit="px" />
        </Row>

        <Row label={`Page margin — ${style.pageMargin}px`}>
          <Slider min={20} max={72} step={4} value={style.pageMargin} onChange={v => set("pageMargin", v)} unit="px" />
        </Row>

        <button
          onClick={() => { onChange({ ...DEFAULT_STYLE }); setAiReasoning(null); }}
          className="btn btn-ghost mono"
          style={{ width: "100%", justifyContent: "center", height: 30, fontSize: 11, marginTop: 4 }}
        >
          reset to defaults
        </button>
      </div>
    </div>
  );
}
