"use client";

import { Icon, Pill } from "@/components/ui/Icon";

interface JDBarProps {
  jd: string;
  setJD: (v: string) => void;
  matchedKeywords?: number;
  missingKeywords?: number;
}

export function JDBar({ jd, setJD, matchedKeywords = 0, missingKeywords = 0 }: JDBarProps) {
  return (
    <div style={{
      height: 38,
      display: "flex", alignItems: "center", gap: 10,
      padding: "0 16px",
      background: "var(--bg-0)",
      borderBottom: "1px solid var(--line)",
      flexShrink: 0,
    }}>
      <span className="mono" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
        <Icon name="target" size={12} />
        <span style={{ color: "var(--fg-3)" }}>jd ›</span>
      </span>
      <input
        value={jd}
        onChange={(e) => setJD(e.target.value)}
        placeholder="paste a job description to tailor the rewrite…"
        className="mono"
        style={{ flex: 1, fontSize: 12, color: "var(--fg-1)", letterSpacing: 0 }}
      />
      {jd && matchedKeywords > 0 && (
        <Pill tone="accent" className="mono">{matchedKeywords} keywords matched</Pill>
      )}
      {jd && missingKeywords > 0 && (
        <Pill tone="ghost" className="mono">{missingKeywords} missing</Pill>
      )}
      {jd && (
        <button
          onClick={() => setJD("")}
          className="btn btn-ghost"
          style={{ width: 22, height: 22, padding: 0, justifyContent: "center" }}
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
}
