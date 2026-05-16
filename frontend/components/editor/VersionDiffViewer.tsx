"use client";

import { useEffect, useState } from "react";
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

interface DiffLine {
  text: string;
  type: "same" | "added" | "removed";
}

function flattenContent(c: ResumeContent): string[] {
  const lines: string[] = [];
  const { contact, summary, experience, education, skills, certifications, projects } = c;

  if (contact?.name) lines.push(`NAME: ${contact.name}`);
  if (contact?.email) lines.push(`EMAIL: ${contact.email}`);
  if (contact?.phone) lines.push(`PHONE: ${contact.phone}`);
  if (contact?.location) lines.push(`LOCATION: ${contact.location}`);
  if (contact?.linkedin) lines.push(`LINKEDIN: ${contact.linkedin}`);
  if (contact?.github) lines.push(`GITHUB: ${contact.github}`);

  if (summary) lines.push(`SUMMARY: ${summary}`);

  for (const e of experience ?? []) {
    lines.push(`EXP: ${e.title} @ ${e.company} (${e.start}–${e.end ?? "Present"})`);
    for (const b of e.bullets ?? []) lines.push(`  • ${b}`);
  }

  for (const e of education ?? []) {
    lines.push(`EDU: ${e.degree} ${e.field ? `in ${e.field}` : ""} @ ${e.institution} ${e.year}`);
  }

  const allSkills = [...(skills?.technical ?? []), ...(skills?.soft ?? [])];
  if (allSkills.length) lines.push(`SKILLS: ${allSkills.join(", ")}`);

  for (const p of projects ?? []) {
    lines.push(`PROJECT: ${p.name}`);
    if (p.description) lines.push(`  ${p.description}`);
  }

  for (const cert of certifications ?? []) {
    lines.push(`CERT: ${typeof cert === "string" ? cert : (cert as { name?: string }).name ?? ""}`);
  }

  return lines;
}

function computeDiff(aLines: string[], bLines: string[]): { left: DiffLine[]; right: DiffLine[] } {
  // Simple LCS-based diff
  const aSet = new Set(aLines);
  const bSet = new Set(bLines);
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];

  const aOnly = aLines.filter(l => !bSet.has(l));
  const bOnly = bLines.filter(l => !aSet.has(l));
  const common = aLines.filter(l => bSet.has(l));

  // Interleave: show common, then removed, then added
  const aIdx = new Map(aLines.map((l, i) => [l, i]));
  const bIdx = new Map(bLines.map((l, i) => [l, i]));

  const allKeys = Array.from(new Set([...aLines, ...bLines]));
  // Sort by first appearance in either version
  allKeys.sort((x, y) => {
    const ax = aIdx.get(x) ?? 999;
    const bx = bIdx.get(x) ?? 999;
    const ay = aIdx.get(y) ?? 999;
    const by = bIdx.get(y) ?? 999;
    return Math.min(ax, bx) - Math.min(ay, by);
  });

  for (const line of allKeys) {
    const inA = aSet.has(line);
    const inB = bSet.has(line);
    if (inA && inB) {
      left.push({ text: line, type: "same" });
      right.push({ text: line, type: "same" });
    } else if (inA) {
      left.push({ text: line, type: "removed" });
      right.push({ text: "", type: "removed" });
    } else {
      left.push({ text: "", type: "added" });
      right.push({ text: line, type: "added" });
    }
  }

  return { left, right };
}

export function VersionDiffViewer({ resumeId, onClose, onRestore }: VersionDiffViewerProps) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [leftIdx, setLeftIdx] = useState(1);
  const [rightIdx, setRightIdx] = useState(0);

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

  const fmtTime = (ts: number) => new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  if (versions.length < 2) {
    return createPortal(
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-1)", borderRadius: 12, padding: 32, border: "1px solid var(--line)", textAlign: "center", color: "var(--fg-2)" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Not enough versions</div>
          <div className="mono" style={{ fontSize: 12 }}>You need at least 2 saved versions to compare.</div>
          <button onClick={onClose} className="btn btn-ghost mono" style={{ marginTop: 18 }}>close</button>
        </div>
      </div>,
      document.body
    );
  }

  const leftVersion = versions[leftIdx];
  const rightVersion = versions[rightIdx];
  const { left, right } = computeDiff(
    flattenContent(leftVersion.content),
    flattenContent(rightVersion.content)
  );
  const addedCount = right.filter(l => l.type === "added").length;
  const removedCount = left.filter(l => l.type === "removed").length;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 14,
        width: "min(940px, 96vw)", height: "80vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>Version Diff</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>
              <span style={{ color: "var(--red)" }}>−{removedCount} removed</span>
              {" · "}
              <span style={{ color: "var(--green)" }}>+{addedCount} added</span>
            </div>
          </div>

          {/* Version selectors */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)", marginBottom: 3, textTransform: "uppercase" }}>From</div>
              <select
                value={leftIdx}
                onChange={e => setLeftIdx(Number(e.target.value))}
                className="mono"
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px", fontSize: 11.5, color: "var(--fg-0)", cursor: "pointer" }}
              >
                {versions.map((v, i) => (
                  <option key={i} value={i}>{`v${versions.length - i}`} — {fmtTime(v.savedAt)}</option>
                ))}
              </select>
            </div>
            <div style={{ color: "var(--fg-4)", fontSize: 18, paddingTop: 16 }}>→</div>
            <div>
              <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)", marginBottom: 3, textTransform: "uppercase" }}>To</div>
              <select
                value={rightIdx}
                onChange={e => setRightIdx(Number(e.target.value))}
                className="mono"
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px", fontSize: 11.5, color: "var(--fg-0)", cursor: "pointer" }}
              >
                {versions.map((v, i) => (
                  <option key={i} value={i}>{`v${versions.length - i}`} — {fmtTime(v.savedAt)}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => onRestore(rightVersion)}
            className="btn btn-accent mono"
            style={{ height: 30, fontSize: 11, marginTop: 16 }}
          >
            <Icon name="branch" size={10} /> restore "to"
          </button>
          <button onClick={onClose} style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "var(--fg-2)", fontSize: 14, display: "grid", placeItems: "center", marginTop: 16 }}>×</button>
        </div>

        {/* Diff columns */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
          {/* Left */}
          <div style={{ borderRight: "1px solid var(--line)", overflow: "auto" }}>
            <div className="mono" style={{
              position: "sticky", top: 0, zIndex: 1,
              padding: "6px 14px", fontSize: 10.5,
              background: "var(--bg-2)", borderBottom: "1px solid var(--line)",
              color: "var(--fg-3)", display: "flex", gap: 8, alignItems: "center",
            }}>
              <span style={{ color: "var(--red)" }}>−</span>
              v{versions.length - leftIdx} · {fmtTime(leftVersion.savedAt)}
              <span style={{ marginLeft: "auto", color: "var(--fg-4)" }}>{leftVersion.label}</span>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.6 }}>
              {left.map((line, i) => (
                <div key={i} style={{
                  padding: "2px 14px",
                  background: line.type === "removed" ? "color-mix(in oklch, var(--red) 10%, transparent)" : "transparent",
                  borderLeft: line.type === "removed" ? "2px solid var(--red)" : "2px solid transparent",
                  color: line.type === "removed" ? "var(--fg-0)" : line.type === "same" ? "var(--fg-1)" : "transparent",
                  minHeight: 22,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {line.type === "removed" && <span style={{ color: "var(--red)", marginRight: 6 }}>−</span>}
                  {line.text}
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div style={{ overflow: "auto" }}>
            <div className="mono" style={{
              position: "sticky", top: 0, zIndex: 1,
              padding: "6px 14px", fontSize: 10.5,
              background: "var(--bg-2)", borderBottom: "1px solid var(--line)",
              color: "var(--fg-3)", display: "flex", gap: 8, alignItems: "center",
            }}>
              <span style={{ color: "var(--green)" }}>+</span>
              v{versions.length - rightIdx} · {fmtTime(rightVersion.savedAt)}
              <span style={{ marginLeft: "auto", color: "var(--fg-4)" }}>{rightVersion.label}</span>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.6 }}>
              {right.map((line, i) => (
                <div key={i} style={{
                  padding: "2px 14px",
                  background: line.type === "added" ? "color-mix(in oklch, var(--green) 10%, transparent)" : "transparent",
                  borderLeft: line.type === "added" ? "2px solid var(--green)" : "2px solid transparent",
                  color: line.type === "added" ? "var(--fg-0)" : line.type === "same" ? "var(--fg-1)" : "transparent",
                  minHeight: 22,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {line.type === "added" && <span style={{ color: "var(--green)", marginRight: 6 }}>+</span>}
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
