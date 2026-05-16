"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getVersions } from "@/lib/db";
import type { ResumeVersion } from "@/lib/db";
import type { ResumeContent } from "@/types/resume";
import { Icon } from "@/components/ui/Icon";

interface VersionDiffViewerProps {
  resumeId: string;
  onClose: () => void;
  onRestore: (version: ResumeVersion) => void;
}

/* ── Structured flattening with section tags ── */
interface FlatLine {
  text: string;
  section: string;
  indent: number;
}

function flattenContent(c: ResumeContent): FlatLine[] {
  const out: FlatLine[] = [];
  const add = (text: string, section: string, indent = 0) =>
    out.push({ text, section, indent });

  const { contact, summary, experience, education, skills, certifications, projects } = c;

  // CONTACT
  if (contact?.name)     add(contact.name, "contact");
  if (contact?.email)    add(contact.email, "contact");
  if (contact?.phone)    add(contact.phone, "contact");
  if (contact?.location) add(contact.location, "contact");
  if (contact?.linkedin) add(contact.linkedin, "contact");
  if (contact?.github)   add(contact.github, "contact");

  // SUMMARY
  if (summary) {
    // Split long summary into wrapped logical chunks for better diff
    summary.match(/.{1,120}(\s|$)/g)?.forEach(chunk => add(chunk.trim(), "summary"));
  }

  // EXPERIENCE
  for (const e of experience ?? []) {
    add(`${e.company}  ·  ${e.title}`, "experience");
    add(`${e.start} – ${e.end ?? "Present"}`, "experience", 1);
    for (const b of e.bullets ?? []) add(b, "experience", 1);
  }

  // EDUCATION
  for (const e of education ?? []) {
    add(`${e.degree}${e.field ? " in " + e.field : ""}`, "education");
    add(e.institution + (e.year ? "  ·  " + e.year : ""), "education", 1);
  }

  // SKILLS
  const allSkills = [...(skills?.technical ?? []), ...(skills?.soft ?? [])];
  for (const sk of allSkills) add(sk, "skills");

  // PROJECTS
  for (const p of projects ?? []) {
    add(p.name, "projects");
    if (p.technologies?.length) add(p.technologies.join(", "), "projects", 1);
    if (p.description) add(p.description, "projects", 1);
  }

  // CERTIFICATIONS
  for (const cert of certifications ?? []) {
    const label = typeof cert === "string" ? cert : (cert as { name?: string }).name ?? "";
    add(label, "certifications");
  }

  return out;
}

/* ── True LCS diff on FlatLine arrays ── */
type DiffOp = "same" | "removed" | "added" | "empty";

interface DiffRow {
  left:  { text: string; section: string; indent: number; op: DiffOp };
  right: { text: string; section: string; indent: number; op: DiffOp };
}

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp;
}

function computeDiff(aLines: FlatLine[], bLines: FlatLine[]): DiffRow[] {
  const aTexts = aLines.map(l => l.text);
  const bTexts = bLines.map(l => l.text);
  const dp = lcs(aTexts, bTexts);

  const rows: DiffRow[] = [];
  let i = aLines.length, j = bLines.length;
  const ops: Array<["same" | "removed" | "added", FlatLine?, FlatLine?]> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aTexts[i - 1] === bTexts[j - 1]) {
      ops.push(["same", aLines[i - 1], bLines[j - 1]]);
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push(["added", undefined, bLines[j - 1]]);
      j--;
    } else {
      ops.push(["removed", aLines[i - 1], undefined]);
      i--;
    }
  }
  ops.reverse();

  // Pair up adjacent removed/added for inline display
  const EMPTY: FlatLine = { text: "", section: "", indent: 0 };
  for (let k = 0; k < ops.length; k++) {
    const [op, a, b] = ops[k];
    if (op === "same") {
      rows.push({
        left:  { ...a!, op: "same" },
        right: { ...b!, op: "same" },
      });
    } else if (op === "removed") {
      // Peek ahead: if next is "added", pair them side-by-side
      if (k + 1 < ops.length && ops[k + 1][0] === "added") {
        const [, , nextB] = ops[k + 1];
        rows.push({
          left:  { ...a!, op: "removed" },
          right: { ...nextB!, op: "added" },
        });
        k++;
      } else {
        rows.push({
          left:  { ...a!, op: "removed" },
          right: { ...EMPTY, op: "empty" },
        });
      }
    } else {
      rows.push({
        left:  { ...EMPTY, op: "empty" },
        right: { ...b!, op: "added" },
      });
    }
  }

  return rows;
}

/* ── Section metadata ── */
const SECTION_META: Record<string, { label: string; color: string }> = {
  contact:        { label: "Contact",        color: "#6366f1" },
  summary:        { label: "Summary",        color: "#0891b2" },
  experience:     { label: "Experience",     color: "#f59e0b" },
  education:      { label: "Education",      color: "#10b981" },
  skills:         { label: "Skills",         color: "#8b5cf6" },
  projects:       { label: "Projects",       color: "#ec4899" },
  certifications: { label: "Certifications", color: "#14b8a6" },
};

const SECTION_ORDER = ["contact","summary","experience","education","skills","projects","certifications"];

/* ── Section change summary ── */
function sectionChanges(rows: DiffRow[]) {
  const map: Record<string, { added: number; removed: number }> = {};
  for (const row of rows) {
    if (row.left.op === "removed" && row.left.section) {
      const s = row.left.section;
      map[s] = map[s] ?? { added: 0, removed: 0 };
      map[s].removed++;
    }
    if (row.right.op === "added" && row.right.section) {
      const s = row.right.section;
      map[s] = map[s] ?? { added: 0, removed: 0 };
      map[s].added++;
    }
  }
  return map;
}

/* ── Component ── */
export function VersionDiffViewer({ resumeId, onClose, onRestore }: VersionDiffViewerProps) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [leftIdx, setLeftIdx] = useState(1);
  const [rightIdx, setRightIdx] = useState(0);
  const [showOnly, setShowOnly] = useState<"all" | "changed">("all");
  const syncRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    getVersions(resumeId).then(vs => {
      setVersions(vs);
      setLeftIdx(Math.min(1, vs.length - 1));
      setRightIdx(0);
    });
  }, [resumeId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Sync scroll between left and right panels
  useEffect(() => {
    const l = leftRef.current, r = rightRef.current;
    if (!l || !r) return;
    const onScrollL = () => { if (syncingRef.current) return; syncingRef.current = true; r.scrollTop = l.scrollTop; requestAnimationFrame(() => { syncingRef.current = false; }); };
    const onScrollR = () => { if (syncingRef.current) return; syncingRef.current = true; l.scrollTop = r.scrollTop; requestAnimationFrame(() => { syncingRef.current = false; }); };
    l.addEventListener("scroll", onScrollL);
    r.addEventListener("scroll", onScrollR);
    return () => { l.removeEventListener("scroll", onScrollL); r.removeEventListener("scroll", onScrollR); };
  }, [versions, leftIdx, rightIdx]);

  const fmtTime = (ts: number) => new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  if (versions.length < 2) {
    return createPortal(
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-1)", borderRadius: 14, padding: 36, border: "1px solid var(--line)", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)", marginBottom: 8 }}>Not enough versions</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>You need at least 2 saved versions to compare.</div>
          <button onClick={onClose} className="btn btn-ghost mono" style={{ marginTop: 20, width: "100%", justifyContent: "center" }}>close</button>
        </div>
      </div>,
      document.body
    );
  }

  const leftVersion  = versions[leftIdx];
  const rightVersion = versions[rightIdx];
  const allRows = computeDiff(flattenContent(leftVersion.content), flattenContent(rightVersion.content));
  const rows = showOnly === "changed" ? allRows.filter(r => r.left.op !== "same") : allRows;

  const addedCount   = allRows.filter(r => r.right.op === "added").length;
  const removedCount = allRows.filter(r => r.left.op  === "removed").length;
  const changedCount = addedCount + removedCount;
  const secChanges   = sectionChanges(allRows);

  // Insert section dividers
  const displayItems: Array<{ type: "row"; row: DiffRow; lineNum: number } | { type: "divider"; section: string }> = [];
  let lastSection = "";
  let lineNum = 0;
  for (const row of rows) {
    const sec = row.left.section || row.right.section;
    if (sec && sec !== lastSection) {
      displayItems.push({ type: "divider", section: sec });
      lastSection = sec;
    }
    lineNum++;
    displayItems.push({ type: "row", row, lineNum });
  }

  const opBg = (op: DiffOp, side: "left" | "right") => {
    if (op === "removed") return "color-mix(in oklch, #ef4444 12%, transparent)";
    if (op === "added")   return "color-mix(in oklch, #22c55e 12%, transparent)";
    if (op === "empty")   return "color-mix(in oklch, var(--line) 30%, transparent)";
    return "transparent";
  };
  const opBorder = (op: DiffOp) => {
    if (op === "removed") return "2px solid #ef4444";
    if (op === "added")   return "2px solid #22c55e";
    return "2px solid transparent";
  };
  const opColor = (op: DiffOp) => {
    if (op === "removed") return "#f87171";
    if (op === "added")   return "#4ade80";
    if (op === "empty")   return "transparent";
    return "var(--fg-1)";
  };

  const SideHeader = ({ idx, versionCount, version, mark, markColor }: { idx: number; versionCount: number; version: ResumeVersion; mark: string; markColor: string }) => (
    <div style={{
      position: "sticky", top: 0, zIndex: 2,
      padding: "8px 16px", background: "var(--bg-0)", borderBottom: "1px solid var(--line)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: markColor, fontFamily: "var(--mono)" }}>{mark}</span>
      <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-1)", fontWeight: 600 }}>
        v{versionCount - idx}
      </span>
      <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>·</span>
      <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{fmtTime(version.savedAt)}</span>
      <span style={{ flex: 1 }} />
      <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)", background: "var(--bg-2)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--line)" }}>
        {version.label || "Auto-save"}
      </span>
    </div>
  );

  const renderLine = (cell: DiffRow["left"] | DiffRow["right"], lineN: number, side: "left" | "right") => (
    <div style={{
      display: "flex", minHeight: 26,
      background: opBg(cell.op, side),
      borderLeft: side === "left" ? opBorder(cell.op) : undefined,
      borderRight: side === "right" ? opBorder(cell.op) : undefined,
    }}>
      {/* Line number */}
      <div style={{
        width: 38, flexShrink: 0, textAlign: "right", paddingRight: 10,
        fontFamily: "var(--mono)", fontSize: 10.5, lineHeight: "26px",
        color: "var(--fg-4)", userSelect: "none",
        background: "color-mix(in oklch, var(--bg-2) 60%, transparent)",
        borderRight: "1px solid var(--line-soft)",
      }}>
        {cell.op !== "empty" ? lineN : ""}
      </div>
      {/* Op glyph */}
      <div style={{
        width: 18, flexShrink: 0, textAlign: "center", lineHeight: "26px",
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700,
        color: cell.op === "removed" ? "#f87171" : cell.op === "added" ? "#4ade80" : "transparent",
      }}>
        {cell.op === "removed" ? "−" : cell.op === "added" ? "+" : " "}
      </div>
      {/* Content */}
      <div style={{
        flex: 1, padding: "3px 10px 3px 0",
        fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.6,
        color: opColor(cell.op),
        paddingLeft: cell.indent ? 20 : 4,
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {cell.text}
      </div>
    </div>
  );

  return createPortal(
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 16,
        width: "min(1100px, 96vw)", height: "88vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 96px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>

        {/* ── Top bar ── */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
          background: "var(--bg-0)",
        }}>
          {/* Title */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>Version Diff</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 1 }}>
              {changedCount === 0
                ? "no changes between versions"
                : <><span style={{ color: "#f87171" }}>−{removedCount}</span> removed · <span style={{ color: "#4ade80" }}>+{addedCount}</span> added</>}
            </div>
          </div>

          {/* Section change pills */}
          <div style={{ display: "flex", gap: 5, flex: 1, flexWrap: "wrap" }}>
            {SECTION_ORDER.filter(s => secChanges[s]).map(s => {
              const { label, color } = SECTION_META[s];
              const { added, removed } = secChanges[s];
              return (
                <span key={s} className="mono" style={{
                  fontSize: 9.5, padding: "2px 7px", borderRadius: 99,
                  background: `${color}18`, border: `1px solid ${color}44`, color,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {label}
                  {removed > 0 && <span style={{ color: "#f87171" }}>−{removed}</span>}
                  {added > 0  && <span style={{ color: "#4ade80" }}>+{added}</span>}
                </span>
              );
            })}
          </div>

          {/* Version selectors */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <select value={leftIdx} onChange={e => setLeftIdx(Number(e.target.value))} className="mono"
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 9px", fontSize: 11.5, color: "var(--fg-0)", cursor: "pointer" }}>
              {versions.map((v, i) => <option key={i} value={i}>v{versions.length - i} — {fmtTime(v.savedAt)}</option>)}
            </select>
            <span style={{ color: "var(--fg-4)", fontSize: 16 }}>→</span>
            <select value={rightIdx} onChange={e => setRightIdx(Number(e.target.value))} className="mono"
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 9px", fontSize: 11.5, color: "var(--fg-0)", cursor: "pointer" }}>
              {versions.map((v, i) => <option key={i} value={i}>v{versions.length - i} — {fmtTime(v.savedAt)}</option>)}
            </select>
          </div>

          {/* Filter toggle */}
          <div style={{ display: "flex", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 7, padding: 2, flexShrink: 0 }}>
            {(["all", "changed"] as const).map(m => (
              <button key={m} onClick={() => setShowOnly(m)} className="mono" style={{
                fontSize: 10.5, padding: "3px 10px", borderRadius: 5,
                background: showOnly === m ? "var(--bg-0)" : "transparent",
                color: showOnly === m ? "var(--accent)" : "var(--fg-3)",
                border: 0, cursor: "pointer",
                boxShadow: showOnly === m ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}>{m}</button>
            ))}
          </div>

          {/* Restore + close */}
          <button onClick={() => onRestore(rightVersion)} className="btn btn-accent mono"
            style={{ height: 32, fontSize: 11, padding: "0 14px", flexShrink: 0 }}>
            <Icon name="branch" size={10} /> restore →
          </button>
          <button onClick={onClose} style={{
            background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 7,
            width: 30, height: 30, cursor: "pointer", color: "var(--fg-2)",
            fontSize: 16, display: "grid", placeItems: "center", flexShrink: 0,
          }}>×</button>
        </div>

        {/* ── Diff columns ── */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0, overflow: "hidden" }}>
          {/* LEFT */}
          <div ref={leftRef} style={{ borderRight: "1px solid var(--line)", overflow: "auto", display: "flex", flexDirection: "column" }}>
            <SideHeader idx={leftIdx} versionCount={versions.length} version={leftVersion} mark="−" markColor="#f87171" />
            <div style={{ flex: 1 }}>
              {displayItems.map((item, i) => {
                if (item.type === "divider") {
                  const meta = SECTION_META[item.section] ?? { label: item.section, color: "var(--fg-3)" };
                  return (
                    <div key={`div-${i}`} style={{
                      padding: "5px 16px", background: `${meta.color}14`,
                      borderTop: `1px solid ${meta.color}30`, borderBottom: `1px solid ${meta.color}30`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: meta.color, display: "inline-block" }} />
                      <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                  );
                }
                return <div key={i}>{renderLine(item.row.left, item.lineNum, "left")}</div>;
              })}
            </div>
          </div>

          {/* RIGHT */}
          <div ref={rightRef} style={{ overflow: "auto", display: "flex", flexDirection: "column" }}>
            <SideHeader idx={rightIdx} versionCount={versions.length} version={rightVersion} mark="+" markColor="#4ade80" />
            <div style={{ flex: 1 }}>
              {displayItems.map((item, i) => {
                if (item.type === "divider") {
                  const meta = SECTION_META[item.section] ?? { label: item.section, color: "var(--fg-3)" };
                  return (
                    <div key={`div-${i}`} style={{
                      padding: "5px 16px", background: `${meta.color}14`,
                      borderTop: `1px solid ${meta.color}30`, borderBottom: `1px solid ${meta.color}30`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: meta.color, display: "inline-block" }} />
                      <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                  );
                }
                return <div key={i}>{renderLine(item.row.right, item.lineNum, "right")}</div>;
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "8px 20px", borderTop: "1px solid var(--line)",
          background: "var(--bg-0)", display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
        }}>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
            {allRows.length} lines · {changedCount} changes · scrolling is synced
          </span>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>Esc to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
