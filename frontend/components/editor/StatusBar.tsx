"use client";

import { Icon } from "@/components/ui/Icon";
import type { ATSAnalysis } from "@/types/resume";

interface StatusBarProps {
  ats: ATSAnalysis | null;
  aiState: "idle" | "streaming" | "review" | "accepted";
  wordCount: number;
  heatmap: boolean;
  version?: string;
}

export function StatusBar({ ats, aiState, wordCount, heatmap, version }: StatusBarProps) {
  const score = ats?.score ?? null;
  return (
    <footer className="mono" style={{
      height: 26,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 10px",
      background: "var(--bg-1)",
      color: "var(--fg-2)",
      borderTop: "1px solid var(--line)",
      fontSize: 11,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)" }}>
          <Icon name="branch" size={11} /> main
        </span>
        <span style={{ color: "var(--fg-3)" }}>·</span>
        <span><span style={{ color: "var(--green)" }}>●</span> 0 errors</span>
        <span style={{ color: "var(--fg-3)" }}>·</span>
        <span>heatmap {heatmap ? <span style={{ color: "var(--accent)" }}>on</span> : "off"}</span>
        {score !== null && (
          <span>ats <span style={{ color: score >= 80 ? "var(--green)" : score >= 60 ? "var(--amber)" : "var(--red)" }}>{score}</span></span>
        )}
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {wordCount > 0 && <span>{wordCount} words</span>}
        <span style={{ color: "var(--fg-3)" }}>·</span>
        {version && <span>{version}</span>}
        <span style={{ color: "var(--fg-3)" }}>·</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: aiState === "streaming" ? "var(--accent)" : "var(--fg-2)" }}>
          <Icon name="bolt" size={11} />
          agent · {aiState === "streaming" ? "running" : aiState === "review" ? "review" : aiState === "accepted" ? "applied" : "idle"}
        </span>
      </div>
    </footer>
  );
}
