"use client";

import { Icon } from "@/components/ui/Icon";
import type { ATSAnalysis, ResumeContent } from "@/types/resume";

interface StatusBarProps {
  ats: ATSAnalysis | null;
  aiState: "idle" | "streaming" | "review" | "accepted";
  wordCount: number;
  heatmap: boolean;
  version?: string;
  errorCount?: number;
  resume?: ResumeContent | null;
}

function completeness(c: ResumeContent): number {
  let pts = 0, total = 7;
  if (c.contact?.name) pts++;
  if (c.contact?.email) pts++;
  if (c.summary && c.summary.length > 20) pts++;
  if (c.experience && c.experience.length > 0) pts++;
  if (c.education && c.education.length > 0) pts++;
  if (c.skills?.technical && c.skills.technical.length > 0) pts++;
  if (c.projects && c.projects.length > 0) pts++;
  return Math.round((pts / total) * 100);
}

export function StatusBar({ ats, aiState, wordCount, heatmap, version, errorCount = 0, resume }: StatusBarProps) {
  const score = ats?.score ?? null;
  const profileScore = resume ? completeness(resume) : null;
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
        <span>
          <span style={{ color: errorCount > 0 ? "var(--red)" : "var(--green)" }}>●</span>
          {" "}{errorCount} error{errorCount !== 1 ? "s" : ""}
        </span>
        <span style={{ color: "var(--fg-3)" }}>·</span>
        <span>heatmap {heatmap ? <span style={{ color: "var(--accent)" }}>on</span> : "off"}</span>
        {score !== null && (
          <>
            <span style={{ color: "var(--fg-3)" }}>·</span>
            <span>ats <span style={{ color: score >= 80 ? "var(--green)" : score >= 60 ? "var(--amber)" : "var(--red)" }}>{score}</span></span>
          </>
        )}
        {profileScore !== null && (
          <>
            <span style={{ color: "var(--fg-3)" }}>·</span>
            <span title="Profile completeness">profile <span style={{ color: profileScore >= 85 ? "var(--green)" : profileScore >= 50 ? "var(--amber)" : "var(--red)" }}>{profileScore}%</span></span>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {wordCount > 0 && <><span>{wordCount} words</span><span style={{ color: "var(--fg-3)" }}>·</span></>}
        {version && <><span>{version}</span><span style={{ color: "var(--fg-3)" }}>·</span></>}
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: aiState === "streaming" ? "var(--accent)" : "var(--fg-2)" }}>
          <Icon name="bolt" size={11} />
          agent · {aiState === "streaming" ? "running" : aiState === "review" ? "review" : aiState === "accepted" ? "applied" : "idle"}
        </span>
      </div>
    </footer>
  );
}
