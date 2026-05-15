"use client";

import { useMemo, useState } from "react";
import { Icon, Pill } from "@/components/ui/Icon";
import type { ResumeContent } from "@/types/resume";

interface JDBarProps {
  jd: string;
  setJD: (v: string) => void;
  resume: ResumeContent | null;
}

const STOP = new Set(["and","the","to","of","in","a","for","with","that","is","are","on","as","be","an","or","at","by","we","you","our","your","this","have","will","can","work","role","team","ability","strong","experience","years","using","good","great","must","nice","not","but","also","from","more","their","they","etc","its","new","other","some","key","both","all","each","help","take","make","use","get","set","may","how","when","what","any","who","been","has","had"]);

function extractKeywords(text: string): string[] {
  return [...new Set(
    text.toLowerCase().match(/\b[a-z][a-z0-9+#.]{2,}\b/g)?.filter(w => !STOP.has(w)) ?? []
  )];
}

function resumeText(r: ResumeContent | null): string {
  if (!r) return "";
  return [
    r.summary ?? "",
    ...(r.skills?.technical ?? []),
    ...(r.skills?.soft ?? []),
    ...(r.experience?.flatMap(e => [e.title, e.company, ...e.bullets]) ?? []),
    ...(r.projects?.flatMap(p => [p.name, p.description, ...p.technologies]) ?? []),
    ...(r.certifications ?? []),
  ].join(" ");
}

export function JDBar({ jd, setJD, resume }: JDBarProps) {
  const [expanded, setExpanded] = useState(false);

  const { matched, missing } = useMemo(() => {
    if (!jd.trim() || !resume) return { matched: [], missing: [] };
    const jdKw = extractKeywords(jd);
    const resumeKw = new Set(extractKeywords(resumeText(resume)));
    const matched: string[] = [];
    const missing: string[] = [];
    for (const kw of jdKw) {
      if (resumeKw.has(kw)) matched.push(kw);
      else missing.push(kw);
    }
    return { matched, missing };
  }, [jd, resume]);

  const matchPct = matched.length + missing.length > 0
    ? Math.round((matched.length / (matched.length + missing.length)) * 100)
    : null;

  return (
    <div style={{
      borderBottom: "1px solid var(--line)",
      background: "var(--bg-0)",
      flexShrink: 0,
    }}>
      <div style={{ height: 38, display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
        <span className="mono" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <Icon name="target" size={12} />
          <span style={{ color: "var(--fg-3)" }}>jd ›</span>
        </span>
        <input
          value={jd}
          onChange={e => setJD(e.target.value)}
          placeholder="paste a job description to tailor the rewrite…"
          className="mono"
          style={{ flex: 1, fontSize: 12, color: "var(--fg-1)", letterSpacing: 0 }}
        />
        {jd && matchPct !== null && (
          <>
            <Pill tone={matchPct >= 70 ? "accent" : matchPct >= 40 ? "amber" : "ghost"} className="mono">
              {matchPct}% match
            </Pill>
            {missing.length > 0 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="btn btn-ghost mono"
                style={{ height: 22, fontSize: 10, padding: "0 7px", color: "var(--fg-3)" }}
              >
                {missing.length} missing {expanded ? "▲" : "▼"}
              </button>
            )}
          </>
        )}
        {jd && (
          <button onClick={() => { setJD(""); setExpanded(false); }} className="btn btn-ghost" style={{ width: 22, height: 22, padding: 0, justifyContent: "center" }}>
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      {/* Expanded keyword panel */}
      {expanded && jd && (
        <div style={{ padding: "8px 16px 10px", borderTop: "1px solid var(--line-soft)", display: "flex", gap: 16 }}>
          {matched.length > 0 && (
            <div>
              <div className="mono" style={{ fontSize: 9.5, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>matched</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {matched.slice(0, 20).map(k => (
                  <span key={k} className="mono" style={{ fontSize: 10.5, padding: "2px 6px", borderRadius: 4, background: "var(--green-soft)", color: "var(--green)", border: "1px solid color-mix(in oklch, var(--green) 30%, transparent)" }}>{k}</span>
                ))}
              </div>
            </div>
          )}
          {missing.length > 0 && (
            <div>
              <div className="mono" style={{ fontSize: 9.5, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>missing from resume</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {missing.slice(0, 20).map(k => (
                  <span key={k} className="mono" style={{ fontSize: 10.5, padding: "2px 6px", borderRadius: 4, background: "var(--amber-soft)", color: "var(--amber)", border: "1px dashed color-mix(in oklch, var(--amber) 40%, transparent)" }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
