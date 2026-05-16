"use client";

import { useMemo, useState } from "react";
import { Icon, Pill } from "@/components/ui/Icon";
import type { ResumeContent } from "@/types/resume";

interface JDBarProps {
  jd: string;
  setJD: (v: string) => void;
  resume: ResumeContent | null;
  onAutoAddKeywords?: (keywords: string[]) => void;
  onTailor?: () => void;
  tailoring?: boolean;
}

const STOP = new Set(["and","the","to","of","in","a","for","with","that","is","are","on","as","be","an","or","at","by","we","you","our","your","this","have","will","can","work","role","team","ability","strong","experience","years","using","good","great","must","nice","not","but","also","from","more","their","they","etc","its","new","other","some","key","both","all","each","help","take","make","use","get","set","may","how","when","what","any","who","been","has","had","should","would","could","about","into","than","over","after","then","well","also","just","want","need","like","know"]);

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
    ...(r.projects?.flatMap(p => [p.name, p.description ?? "", ...p.technologies]) ?? []),
    ...(r.certifications?.map(c => typeof c === "string" ? c : "") ?? []),
  ].join(" ");
}

function fitGrade(pct: number): { label: string; color: string } {
  if (pct >= 75) return { label: "Strong Fit", color: "var(--green)" };
  if (pct >= 50) return { label: "Moderate Fit", color: "var(--accent)" };
  if (pct >= 30) return { label: "Weak Fit", color: "var(--amber)" };
  return { label: "Low Fit", color: "var(--red)" };
}

export function JDBar({ jd, setJD, resume, onAutoAddKeywords, onTailor, tailoring }: JDBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  const { matched, missing, jdKwCount } = useMemo(() => {
    setAddedKeys(new Set());
    if (!jd.trim() || !resume) return { matched: [], missing: [], jdKwCount: 0 };
    const jdKw = extractKeywords(jd);
    const resumeKw = new Set(extractKeywords(resumeText(resume)));
    const matched: string[] = [];
    const missing: string[] = [];
    for (const kw of jdKw) {
      if (resumeKw.has(kw)) matched.push(kw);
      else missing.push(kw);
    }
    return { matched, missing, jdKwCount: jdKw.length };
  }, [jd, resume]);

  const matchPct = matched.length + missing.length > 0
    ? Math.round((matched.length / (matched.length + missing.length)) * 100)
    : null;

  const grade = matchPct !== null ? fitGrade(matchPct) : null;

  const handleAddKeyword = (kw: string) => {
    onAutoAddKeywords?.([kw]);
    setAddedKeys(prev => new Set(prev).add(kw));
  };

  const handleAddAll = () => {
    const toAdd = missing.filter(k => !addedKeys.has(k)).slice(0, 15);
    onAutoAddKeywords?.(toAdd);
    setAddedKeys(new Set([...addedKeys, ...toAdd]));
  };

  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-0)", flexShrink: 0 }}>
      {/* Main bar */}
      <div style={{ height: 38, display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
        <span className="mono" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <Icon name="target" size={12} />
          <span style={{ color: "var(--fg-3)" }}>jd ›</span>
        </span>
        <input
          value={jd}
          onChange={e => setJD(e.target.value)}
          placeholder="paste a job description to get fit score + missing keywords…"
          className="mono"
          style={{ flex: 1, fontSize: 12, color: "var(--fg-1)", letterSpacing: 0 }}
        />
        {jd && matchPct !== null && (
          <>
            {/* Fit pill */}
            <span className="mono" style={{
              fontSize: 10.5, padding: "2px 8px", borderRadius: 99,
              background: `color-mix(in oklch, ${grade!.color} 12%, transparent)`,
              border: `1px solid color-mix(in oklch, ${grade!.color} 35%, transparent)`,
              color: grade!.color, fontWeight: 700,
            }}>
              {matchPct}% · {grade!.label}
            </span>

            <button
              onClick={() => setExpanded(v => !v)}
              className="btn btn-ghost mono"
              style={{ height: 22, fontSize: 10, padding: "0 7px", color: "var(--fg-3)" }}
            >
              {missing.length > 0 ? `${missing.length} missing` : `${matched.length} matched`} {expanded ? "▲" : "▼"}
            </button>
          </>
        )}
        {jd && onTailor && (
          <button
            onClick={onTailor}
            disabled={tailoring}
            className="btn btn-accent mono"
            style={{ height: 26, fontSize: 11, padding: "0 10px", flexShrink: 0 }}
            title="Rewrite resume to target this specific job description"
          >
            <Icon name="sparkle" size={11} />
            {tailoring ? "tailoring…" : "tailor to JD"}
          </button>
        )}
        {jd && (
          <button onClick={() => { setJD(""); setExpanded(false); }} className="btn btn-ghost" style={{ width: 22, height: 22, padding: 0, justifyContent: "center" }}>
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      {/* Expanded fit panel */}
      {expanded && jd && matchPct !== null && (
        <div style={{ borderTop: "1px solid var(--line-soft)", background: "var(--bg-1)" }}>
          {/* Score bar */}
          <div style={{ padding: "10px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-2)" }}>
                Keyword Coverage — <span style={{ color: grade!.color }}>{grade!.label}</span>
              </span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
                {matched.length}/{jdKwCount} keywords
              </span>
            </div>
            <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                width: `${matchPct}%`, height: "100%",
                background: grade!.color,
                borderRadius: 99,
                transition: "width 500ms ease",
              }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 0, padding: "0 16px 12px" }}>
            {/* Matched */}
            {matched.length > 0 && (
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div className="mono" style={{ fontSize: 9.5, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--green)", display: "inline-block" }} />
                  matched ({matched.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {matched.slice(0, 20).map(k => (
                    <span key={k} className="mono" style={{
                      fontSize: 10.5, padding: "2px 7px", borderRadius: 4,
                      background: "var(--green-soft)", color: "var(--green)",
                      border: "1px solid color-mix(in oklch, var(--green) 30%, transparent)",
                    }}>{k}</span>
                  ))}
                  {matched.length > 20 && (
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>+{matched.length - 20} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Missing */}
            {missing.length > 0 && (
              <div style={{ flex: 1, borderLeft: matched.length > 0 ? "1px solid var(--line-soft)" : "none", paddingLeft: matched.length > 0 ? 16 : 0 }}>
                <div className="mono" style={{
                  fontSize: 9.5, color: "var(--amber)", textTransform: "uppercase",
                  letterSpacing: "0.1em", marginBottom: 6,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--amber)", display: "inline-block" }} />
                    missing ({missing.length})
                  </span>
                  {onAutoAddKeywords && (
                    <button
                      onClick={handleAddAll}
                      className="mono"
                      style={{
                        background: "var(--amber-soft)", color: "var(--amber)",
                        border: "1px solid color-mix(in oklch, var(--amber) 40%, transparent)",
                        borderRadius: 4, padding: "2px 8px", fontSize: 9.5,
                        cursor: "pointer", fontWeight: 600,
                      }}
                    >
                      + add all to skills
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {missing.slice(0, 20).map(k => {
                    const added = addedKeys.has(k);
                    return (
                      <button
                        key={k}
                        onClick={() => !added && handleAddKeyword(k)}
                        className="mono"
                        style={{
                          fontSize: 10.5, padding: "2px 7px", borderRadius: 4,
                          background: added ? "var(--green-soft)" : "var(--amber-soft)",
                          color: added ? "var(--green)" : "var(--amber)",
                          border: added
                            ? "1px solid color-mix(in oklch, var(--green) 30%, transparent)"
                            : "1px dashed color-mix(in oklch, var(--amber) 40%, transparent)",
                          cursor: added ? "default" : "pointer",
                          transition: "all 0.2s",
                        }}
                        title={added ? "Added to skills" : "Click to add to skills"}
                      >
                        {added ? "✓ " : "+ "}{k}
                      </button>
                    );
                  })}
                  {missing.length > 20 && (
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>+{missing.length - 20} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
