"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { useResumeStore } from "@/store/resumeStore";
import type { ResumeContent, ATSAnalysis, ResumeExperience } from "@/types/resume";

type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications";

interface CanvasProps {
  resume: ResumeContent | null;
  rawText: string;
  activeSection: SectionId;
  heatmap: boolean;
  onToggleHeatmap: () => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  ats: ATSAnalysis | null;
  onTextChange: (text: string) => void;
  onSectionRewrite?: (section: string) => void;
  requestGhost?: (context: string) => void;
}

export function Canvas({
  resume, rawText, activeSection, heatmap, onToggleHeatmap,
  aiState, ats, onTextChange, onSectionRewrite, requestGhost,
}: CanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ai, updateContent } = useResumeStore();

  const scrollToSection = (sec: string) => {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-sec="${sec}"]`) as HTMLElement | null;
    if (!el) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    container.scrollBy({ top: elTop - containerTop - 24, behavior: "smooth" });
  };

  useEffect(() => { scrollToSection(activeSection); }, [activeSection]);
  useEffect(() => { if (ai.streamingSection) scrollToSection(ai.streamingSection); }, [ai.streamingSection]);

  const hasContent = resume && (
    resume.contact?.name || resume.contact?.email ||
    resume.summary || (resume.experience?.length ?? 0) > 0
  );

  return (
    <main style={{
      background: "var(--bg-0)",
      display: "flex", flexDirection: "column",
      minHeight: 0, height: "100%",
      borderRight: "1px solid var(--line)",
      position: "relative",
    }}>
      {/* tab strip */}
      <div style={{
        height: 34, display: "flex", alignItems: "center",
        background: "var(--bg-1)", borderBottom: "1px solid var(--line)",
        padding: "0 8px", gap: 4, flexShrink: 0,
      }}>
        <CanvasTab active label="resume.md" />
        <div style={{ flex: 1 }} />
        <button
          onClick={onToggleHeatmap}
          className="btn mono"
          style={{
            background: heatmap ? "var(--accent-soft)" : "transparent",
            color: heatmap ? "var(--accent)" : "var(--fg-2)",
            borderColor: heatmap ? "var(--accent-line)" : "transparent",
            height: 24, fontSize: 11,
          }}
        >
          <Icon name="flame" size={11} /> ats heatmap
        </button>
      </div>

      <div ref={scrollRef} style={{
        flex: 1, overflow: "auto",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: "32px 36px 0",
      }}>
        {hasContent ? (
          <ResumeArticle
            resume={resume!}
            heatmap={heatmap}
            aiState={aiState}
            streamingSection={ai.streamingSection}
            sectionTokens={ai.sectionTokens}
            ats={ats}
            ghostText={ai.ghostText}
            onUpdate={updateContent}
            onSectionRewrite={onSectionRewrite}
            requestGhost={requestGhost}
          />
        ) : (
          <RawTextFallback rawText={rawText} aiState={aiState} />
        )}
        <div style={{ height: heatmap && ats ? 80 : 48, flexShrink: 0 }} />
      </div>

      {heatmap && ats && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          padding: "12px 0 14px",
          background: "linear-gradient(to top, var(--bg-0) 60%, transparent)",
          pointerEvents: "none", zIndex: 10,
        }}>
          <HeatLegend ats={ats} />
        </div>
      )}
    </main>
  );
}

/* ── helpers ── */

function CanvasTab({ active, label }: { active?: boolean; label: string }) {
  return (
    <div style={{
      position: "relative", height: 34, padding: "0 14px",
      display: "flex", alignItems: "center", gap: 8,
      background: active ? "var(--bg-0)" : "transparent",
      borderRight: "1px solid var(--line)",
      borderLeft: active ? "1px solid var(--line)" : "1px solid transparent",
      marginBottom: -1, fontSize: 12,
      color: active ? "var(--fg-0)" : "var(--fg-2)", cursor: "pointer",
    }} className="mono">
      <Icon name="doc" size={12} />
      {label}
      {active && <span style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: "var(--accent)" }} />}
    </div>
  );
}

function bulletHeat(bullet: string, missingKw: string[]): "red" | "amber" | "green" | null {
  if (!missingKw.length) return null;
  const lower = bullet.toLowerCase();
  const words: string[] = lower.match(/\w{4,}/g) ?? [];
  const hasNumbers = /\d/.test(bullet);
  const hasAction = /^(spearhead|led|built|designed|developed|implemented|managed|created|improved|increased|reduced|delivered|launched|architected|engineered|optimized|drove|mentored)/i.test(bullet.trim());
  const matchedKw = missingKw.filter(k => words.includes(k.toLowerCase())).length;
  if (hasNumbers && hasAction) return "green";
  if (matchedKw > 0 || hasAction) return "amber";
  return "red";
}

function SectionHeader({ label, count, onRewrite, isStreaming }: {
  label: string; count?: string;
  onRewrite?: () => void; isStreaming?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="mono" style={{ color: "var(--fg-3)", fontSize: 11, width: 28, textAlign: "right" }}>{"<>"}</span>
      <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)", fontWeight: 600 }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      {count && <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10.5 }}>{count}</span>}
      {onRewrite && (hover || isStreaming) && (
        <button
          onClick={onRewrite}
          disabled={isStreaming}
          className="btn mono"
          style={{
            height: 20, fontSize: 10, padding: "0 7px",
            background: isStreaming ? "var(--accent-soft)" : "var(--bg-2)",
            color: isStreaming ? "var(--accent)" : "var(--fg-2)",
            borderColor: isStreaming ? "var(--accent-line)" : "var(--line)",
          }}
        >
          <Icon name="sparkle" size={9} />
          {isStreaming ? "rewriting…" : "rewrite"}
        </button>
      )}
    </div>
  );
}

/* ── Inline editable field ── */
function EditableText({
  value, onSave, multiline = false, style: styleProp, className,
  placeholder = "click to edit", inputWidth,
}: {
  value: string; onSave: (v: string) => void;
  multiline?: boolean; style?: React.CSSProperties; className?: string;
  placeholder?: string; inputWidth?: number | string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim());
  };

  if (editing) {
    const shared: React.CSSProperties = {
      ...styleProp, width: inputWidth ?? "100%", background: "color-mix(in oklch, var(--accent) 5%, var(--bg-1))",
      border: "1px solid var(--accent-line)", borderRadius: 4, outline: "none",
      fontFamily: "inherit", fontSize: "inherit", color: "inherit", lineHeight: "inherit",
      padding: "2px 6px", resize: "none",
    };
    if (multiline) {
      return (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
          rows={Math.max(3, draft.split("\n").length)}
          style={shared}
          autoFocus
        />
      );
    }
    return (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        style={shared}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        ...styleProp, cursor: "text", borderRadius: 3,
        outline: "1px solid transparent",
        transition: "outline-color 0.15s",
      }}
      className={className}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.outlineColor = "var(--accent-line)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.outlineColor = "transparent"; }}
    >
      {value || <span style={{ color: "var(--fg-4)", fontStyle: "italic" }}>{placeholder}</span>}
    </span>
  );
}

/* ── Editable bullet with ghost text ── */
function EditableBullet({
  value, onSave, onDelete, onAdd, heat, heatmap, requestGhost, ghostText,
}: {
  value: string; onSave: (v: string) => void; onDelete: () => void; onAdd: () => void;
  heat: "red" | "amber" | "green" | null; heatmap: boolean;
  requestGhost?: (ctx: string) => void; ghostText?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [showGhost, setShowGhost] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    setShowGhost(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim());
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && requestGhost && !e.shiftKey) {
      e.preventDefault();
      if (ghostText && showGhost) {
        setDraft(d => d + ghostText);
        setShowGhost(false);
      } else {
        requestGhost(draft);
        setShowGhost(true);
      }
    } else if (e.key === "Escape") {
      if (showGhost) { setShowGhost(false); return; }
      setEditing(false); setDraft(value);
    } else if (e.key === "Enter" && e.metaKey) {
      e.preventDefault(); commit(); onAdd();
    } else if (e.key === "Backspace" && draft === "") {
      e.preventDefault(); onDelete();
    } else {
      setShowGhost(false);
    }
  };

  const liStyle: React.CSSProperties = {
    fontSize: 13, lineHeight: 1.55, color: "var(--fg-1)",
    padding: heatmap ? "6px 12px 6px 20px" : "3px 0 3px 16px",
    position: "relative", borderRadius: 4, marginBottom: 2,
    background: heat === "green"
      ? "color-mix(in oklch, var(--green) 8%, transparent)"
      : heat === "amber"
      ? "color-mix(in oklch, var(--amber) 8%, transparent)"
      : heat === "red"
      ? "color-mix(in oklch, var(--red) 8%, transparent)"
      : "transparent",
    borderLeft: heat ? `2px solid var(--${heat})` : heatmap ? "2px solid transparent" : "none",
    transition: "background 0.3s ease, border-color 0.3s ease",
  };

  if (editing) {
    return (
      <li style={{ ...liStyle, padding: "4px 4px 4px 16px" }}>
        <span className="mono" style={{ position: "absolute", left: heatmap ? 6 : 0, top: 8, color: "var(--accent)", fontSize: 10 }}>›</span>
        <div style={{ position: "relative" }}>
          <textarea
            ref={ref}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            rows={Math.max(1, Math.ceil(draft.length / 70))}
            autoFocus
            style={{
              width: "100%", background: "color-mix(in oklch, var(--accent) 5%, var(--bg-1))",
              border: "1px solid var(--accent-line)", borderRadius: 4, outline: "none",
              fontFamily: "var(--sans)", fontSize: 13, color: "var(--fg-0)", lineHeight: 1.55,
              padding: "3px 6px", resize: "none",
            }}
          />
          {showGhost && ghostText && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: "var(--bg-2)", border: "1px solid var(--accent-line)",
              borderRadius: 4, padding: "6px 8px", marginTop: 2,
              fontSize: 12, color: "var(--accent)", zIndex: 10,
            }}>
              <span style={{ color: "var(--fg-3)", fontSize: 10 }} className="mono">Tab to accept · Esc to dismiss</span>
              <div style={{ marginTop: 4, lineHeight: 1.5 }}>{ghostText}</div>
            </div>
          )}
          {showGhost && !ghostText && (
            <div className="mono" style={{
              position: "absolute", top: "100%", left: 0,
              fontSize: 10.5, color: "var(--fg-3)", marginTop: 2,
            }}>generating suggestion…</div>
          )}
        </div>
        <div className="mono" style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 10, color: "var(--fg-3)" }}>
          <span>↵⌘ new bullet</span>
          {requestGhost && <span>Tab ghost</span>}
          <span>Esc cancel</span>
        </div>
      </li>
    );
  }

  return (
    <li
      style={liStyle}
      onClick={() => setEditing(true)}
      className="bullet-hover"
      title="Click to edit · Del to remove"
    >
      <span className="mono" style={{ position: "absolute", left: heatmap ? 6 : 0, top: heatmap ? 8 : 5, color: heat ? `var(--${heat})` : "var(--fg-3)", fontSize: 10 }}>›</span>
      <span style={{ cursor: "text" }}>{value}</span>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="bullet-del mono"
        style={{
          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: 0, color: "var(--fg-4)", fontSize: 10,
          cursor: "pointer", opacity: 0, transition: "opacity 0.1s", padding: "2px 4px",
        }}
      >×</button>
    </li>
  );
}

/* ── Main Article ── */
interface ArticleProps {
  resume: ResumeContent;
  heatmap: boolean;
  aiState: string;
  streamingSection: string | null;
  sectionTokens: Record<string, string>;
  ats: ATSAnalysis | null;
  ghostText: string;
  onUpdate: (c: ResumeContent) => void;
  onSectionRewrite?: (section: string) => void;
  requestGhost?: (context: string) => void;
}

function sectionStyle(sec: string, streamingSection: string | null, isStreaming: boolean): React.CSSProperties {
  if (!isStreaming || !streamingSection) return {};
  const isActive = streamingSection === sec;
  return {
    transition: "filter 0.4s ease, opacity 0.4s ease",
    filter: isActive ? "none" : "blur(1.5px)",
    opacity: isActive ? 1 : 0.5,
    pointerEvents: "none",
  };
}

function StreamingText({ text }: { text: string }) {
  return (
    <span style={{ color: "var(--fg-0)" }}>
      {text}
      <span className="caret" style={{ display: "inline-block", width: 7, height: "1em", background: "var(--accent)", marginLeft: 2, verticalAlign: "text-bottom", borderRadius: 1 }} />
    </span>
  );
}

function ResumeArticle({ resume, heatmap, aiState, streamingSection, sectionTokens, ats, ghostText, onUpdate, onSectionRewrite, requestGhost }: ArticleProps) {
  const isStreaming = aiState === "streaming";
  const missingKw = ats?.missing_keywords ?? [];

  const patch = useCallback((updater: (c: ResumeContent) => ResumeContent) => {
    onUpdate(updater(resume));
  }, [resume, onUpdate]);

  return (
    <article style={{
      width: 760, maxWidth: "100%",
      background: "var(--bg-1)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "48px 56px 64px",
      color: "var(--fg-0)", position: "relative",
      boxShadow: "0 40px 60px -30px black", alignSelf: "flex-start",
    }}>

      {/* ── Contact ── */}
      <header data-sec="contact" style={{ marginBottom: 26, opacity: 1, filter: "none" }}>
        <EditableText
          value={resume.contact?.name || ""}
          placeholder="Your Name"
          onSave={v => patch(c => ({ ...c, contact: { ...c.contact, name: v } }))}
          style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, display: "block", width: "100%" }}
        />
        <div className="mono" style={{ display: "flex", gap: 10, color: "var(--fg-2)", fontSize: 11.5, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {(["email", "phone", "location", "linkedin", "github"] as const).map((field, i) => (
            <span key={field} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {i > 0 && <span style={{ color: "var(--fg-4)" }}>·</span>}
              <EditableText
                value={resume.contact?.[field] || ""}
                placeholder={field}
                onSave={v => patch(c => ({ ...c, contact: { ...c.contact, [field]: v } }))}
                style={{ fontSize: 11.5 }}
              />
            </span>
          ))}
        </div>
      </header>

      {/* ── Summary ── */}
      {(resume.summary !== undefined || sectionTokens["summary"]) && (
        <div data-sec="summary" style={sectionStyle("summary", streamingSection, isStreaming)}>
          <SectionHeader
            label="Summary"
            onRewrite={() => onSectionRewrite?.("summary")}
            isStreaming={streamingSection === "summary" && isStreaming}
          />
          {streamingSection === "summary"
            ? <p style={{ margin: "8px 0 28px", color: "var(--fg-1)", lineHeight: 1.6, fontSize: 14 }}>
                <StreamingText text={sectionTokens["summary"] ?? ""} />
              </p>
            : <EditableText
                value={resume.summary || ""}
                placeholder="Write a professional summary…"
                multiline
                onSave={v => patch(c => ({ ...c, summary: v }))}
                style={{ display: "block", margin: "8px 0 28px", color: "var(--fg-1)", lineHeight: 1.6, fontSize: 14, width: "100%" }}
              />
          }
        </div>
      )}

      {/* ── Experience ── */}
      {((resume.experience && resume.experience.length > 0) || streamingSection === "experience") && (
        <div data-sec="experience" style={sectionStyle("experience", streamingSection, isStreaming)}>
          <SectionHeader
            label="Experience"
            count={resume.experience ? `${resume.experience.length} roles` : undefined}
            onRewrite={() => onSectionRewrite?.("experience")}
            isStreaming={streamingSection === "experience" && isStreaming}
          />
          <div style={{ marginBottom: 28 }}>
            {resume.experience?.map((exp, ei) => (
              <div key={ei} style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <EditableText
                      value={exp.company || ""}
                      placeholder="Company"
                      onSave={v => patch(c => {
                        const ex = [...c.experience];
                        ex[ei] = { ...ex[ei], company: v };
                        return { ...c, experience: ex };
                      })}
                      style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em", display: "block" }}
                    />
                    <EditableText
                      value={exp.title || ""}
                      placeholder="Job Title"
                      onSave={v => patch(c => {
                        const ex = [...c.experience];
                        ex[ei] = { ...ex[ei], title: v };
                        return { ...c, experience: ex };
                      })}
                      style={{ fontSize: 13, color: "var(--fg-1)", display: "block", marginTop: 2 }}
                    />
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)", textAlign: "right", flexShrink: 0, display: "flex", gap: 4, alignItems: "center" }}>
                    <EditableText
                      value={exp.start || ""}
                      placeholder="Start"
                      onSave={v => patch(c => { const ex = [...c.experience]; ex[ei] = { ...ex[ei], start: v }; return { ...c, experience: ex }; })}
                      style={{ fontSize: 11.5 }}
                      inputWidth={80}
                    />
                    <span style={{ color: "var(--fg-4)" }}>—</span>
                    <EditableText
                      value={exp.end || ""}
                      placeholder="End"
                      onSave={v => patch(c => { const ex = [...c.experience]; ex[ei] = { ...ex[ei], end: v }; return { ...c, experience: ex }; })}
                      style={{ fontSize: 11.5 }}
                      inputWidth={80}
                    />
                  </div>
                </div>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
                  {exp.bullets.map((b, bi) => (
                    <EditableBullet
                      key={bi}
                      value={b}
                      heat={heatmap ? bulletHeat(b, missingKw) : null}
                      heatmap={heatmap}
                      requestGhost={requestGhost}
                      ghostText={ghostText}
                      onSave={v => patch(c => {
                        const ex = [...c.experience];
                        const bullets = [...ex[ei].bullets];
                        bullets[bi] = v;
                        ex[ei] = { ...ex[ei], bullets };
                        return { ...c, experience: ex };
                      })}
                      onDelete={() => patch(c => {
                        const ex = [...c.experience];
                        const bullets = ex[ei].bullets.filter((_, i) => i !== bi);
                        ex[ei] = { ...ex[ei], bullets };
                        return { ...c, experience: ex };
                      })}
                      onAdd={() => patch(c => {
                        const ex = [...c.experience];
                        const bullets = [...ex[ei].bullets];
                        bullets.splice(bi + 1, 0, "");
                        ex[ei] = { ...ex[ei], bullets };
                        return { ...c, experience: ex };
                      })}
                    />
                  ))}
                  {/* Add bullet button */}
                  {!isStreaming && (
                    <li style={{ padding: "3px 0 3px 16px" }}>
                      <button
                        onClick={() => patch(c => {
                          const ex = [...c.experience];
                          ex[ei] = { ...ex[ei], bullets: [...ex[ei].bullets, ""] };
                          return { ...c, experience: ex };
                        })}
                        className="btn btn-ghost mono"
                        style={{ height: 20, fontSize: 10, padding: "0 6px", color: "var(--fg-4)" }}
                      >
                        <Icon name="plus" size={9} /> add bullet
                      </button>
                    </li>
                  )}
                  {streamingSection === "experience" && sectionTokens["experience"] && ei === (resume.experience?.length ?? 1) - 1 && (
                    <li style={{ fontSize: 13, lineHeight: 1.55, color: "var(--fg-1)", padding: "3px 0 3px 16px", position: "relative" }}>
                      <span className="mono" style={{ position: "absolute", left: 0, top: 5, color: "var(--accent)", fontSize: 10 }}>›</span>
                      <StreamingText text={sectionTokens["experience"]} />
                    </li>
                  )}
                </ul>
              </div>
            ))}
            {!isStreaming && (
              <button
                onClick={() => patch(c => ({
                  ...c,
                  experience: [...(c.experience ?? []), { company: "", title: "", start: "", end: "", bullets: [""] } as ResumeExperience],
                }))}
                className="btn btn-ghost mono"
                style={{ marginTop: 12, height: 24, fontSize: 11, color: "var(--fg-3)" }}
              >
                <Icon name="plus" size={10} /> add role
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Education ── */}
      {resume.education && resume.education.length > 0 && (
        <div data-sec="education" style={sectionStyle("education", streamingSection, isStreaming)}>
          <SectionHeader label="Education" onRewrite={() => onSectionRewrite?.("education")} isStreaming={streamingSection === "education" && isStreaming} />
          <div style={{ marginBottom: 28 }}>
            {resume.education.map((edu, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-1)", padding: "4px 0", gap: 12 }}>
                <span style={{ flex: 1 }}>
                  <EditableText
                    value={edu.institution || ""}
                    placeholder="Institution"
                    onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], institution: v }; return { ...c, education: ed }; })}
                    style={{ fontWeight: 600, color: "var(--fg-0)" }}
                  />
                  {" — "}
                  <EditableText
                    value={edu.degree || ""}
                    placeholder="Degree"
                    onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], degree: v }; return { ...c, education: ed }; })}
                  />
                  {" "}
                  <EditableText
                    value={edu.field || ""}
                    placeholder="Field"
                    onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], field: v }; return { ...c, education: ed }; })}
                  />
                </span>
                <EditableText
                  value={edu.year || ""}
                  placeholder="Year"
                  onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], year: v }; return { ...c, education: ed }; })}
                  style={{ color: "var(--fg-3)", fontSize: 12, flexShrink: 0 }}
                  className="mono"
                  inputWidth={80}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Skills ── */}
      {(resume.skills || streamingSection === "skills") && (
        <div data-sec="skills" style={sectionStyle("skills", streamingSection, isStreaming)}>
          <SectionHeader label="Skills" onRewrite={() => onSectionRewrite?.("skills")} isStreaming={streamingSection === "skills" && isStreaming} />
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {resume.skills?.technical?.map((s, si) => (
                <EditableSkillChip
                  key={si}
                  value={s}
                  onSave={v => patch(c => {
                    const tech = [...(c.skills?.technical ?? [])];
                    tech[si] = v;
                    return { ...c, skills: { ...c.skills, technical: tech } };
                  })}
                  onDelete={() => patch(c => ({
                    ...c,
                    skills: { ...c.skills, technical: (c.skills?.technical ?? []).filter((_, i) => i !== si) },
                  }))}
                />
              ))}
              <AddSkillChip onAdd={v => patch(c => ({
                ...c,
                skills: { ...c.skills, technical: [...(c.skills?.technical ?? []), v] },
              }))} />
              {streamingSection === "skills" && sectionTokens["skills"] && (
                <span className="mono" style={{
                  fontSize: 11.5, padding: "3px 9px",
                  background: "color-mix(in oklch, var(--accent) 12%, var(--bg-2))",
                  border: "1px solid var(--accent-line)", borderRadius: 4, color: "var(--accent)",
                }}>
                  {sectionTokens["skills"]}
                  <span className="caret" style={{ display: "inline-block", width: 6, height: "0.85em", background: "var(--accent)", marginLeft: 2, verticalAlign: "text-bottom", borderRadius: 1 }} />
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Certifications ── */}
      {resume.certifications && resume.certifications.length > 0 && (
        <div data-sec="certifications" style={sectionStyle("certifications", streamingSection, isStreaming)}>
          <SectionHeader label="Certifications" />
          <div style={{ marginBottom: 28 }}>
            {resume.certifications.map((cert, ci) => (
              <div key={ci} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 13, color: "var(--fg-1)" }}>
                <span className="mono" style={{ color: "var(--accent)", fontSize: 10 }}>✓</span>
                <EditableText
                  value={cert}
                  placeholder="Certification name"
                  onSave={v => patch(c => {
                    const certs = [...(c.certifications ?? [])];
                    certs[ci] = v;
                    return { ...c, certifications: certs };
                  })}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => patch(c => ({ ...c, certifications: (c.certifications ?? []).filter((_, i) => i !== ci) }))}
                  className="btn btn-ghost mono"
                  style={{ width: 20, height: 20, padding: 0, justifyContent: "center", color: "var(--fg-4)", fontSize: 10 }}
                >×</button>
              </div>
            ))}
            <button
              onClick={() => patch(c => ({ ...c, certifications: [...(c.certifications ?? []), ""] }))}
              className="btn btn-ghost mono"
              style={{ marginTop: 6, height: 22, fontSize: 10, color: "var(--fg-3)" }}
            >
              <Icon name="plus" size={9} /> add certification
            </button>
          </div>
        </div>
      )}

      {/* ── Projects ── */}
      {((resume.projects && resume.projects.length > 0) || streamingSection === "projects") && (
        <div data-sec="projects" style={sectionStyle("projects", streamingSection, isStreaming)}>
          <SectionHeader label="Projects" onRewrite={() => onSectionRewrite?.("projects")} isStreaming={streamingSection === "projects" && isStreaming} />
          <div>
            {resume.projects?.map((p, pi) => (
              <div key={pi} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-1)", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <EditableText
                    value={p.name || ""}
                    placeholder="Project name"
                    onSave={v => patch(c => { const pr = [...c.projects]; pr[pi] = { ...pr[pi], name: v }; return { ...c, projects: pr }; })}
                    style={{ fontWeight: 600 }}
                    className="mono"
                  />
                  {p.technologies?.length > 0 && (
                    <span className="mono" style={{ color: "var(--fg-3)", fontSize: 12 }}>· {p.technologies.join(" / ")}</span>
                  )}
                </div>
                <EditableText
                  value={p.description || ""}
                  placeholder="Project description"
                  multiline
                  onSave={v => patch(c => { const pr = [...c.projects]; pr[pi] = { ...pr[pi], description: v }; return { ...c, projects: pr }; })}
                  style={{ color: "var(--fg-1)", display: "block", marginTop: 2 }}
                />
              </div>
            ))}
            {streamingSection === "projects" && sectionTokens["projects"] && (
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-1)", marginBottom: 6 }}>
                <StreamingText text={sectionTokens["projects"]} />
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/* ── Skill chip editing ── */
function EditableSkillChip({ value, onSave, onDelete }: { value: string; onSave: (v: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft.trim()) onSave(draft.trim()); else onDelete(); }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        autoFocus
        className="mono"
        style={{
          fontSize: 11.5, padding: "3px 9px",
          background: "color-mix(in oklch, var(--accent) 8%, var(--bg-1))",
          border: "1px solid var(--accent-line)", borderRadius: 4, color: "var(--fg-0)",
          width: Math.max(60, draft.length * 8),
        }}
      />
    );
  }

  return (
    <span
      className="mono"
      style={{
        fontSize: 11.5, padding: "3px 9px",
        background: "var(--bg-2)", border: "1px solid var(--line)",
        borderRadius: 4, color: "var(--fg-1)", cursor: "text",
        display: "inline-flex", alignItems: "center", gap: 5,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-line)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
    >
      <span onClick={() => setEditing(true)}>{value}</span>
      <span onClick={onDelete} style={{ color: "var(--fg-4)", cursor: "pointer", fontSize: 10, lineHeight: 1 }}>×</span>
    </span>
  );
}

function AddSkillChip({ onAdd }: { onAdd: (v: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  if (adding) {
    return (
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setAdding(false); if (draft.trim()) { onAdd(draft.trim()); setDraft(""); } }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
        autoFocus
        placeholder="new skill"
        className="mono"
        style={{
          fontSize: 11.5, padding: "3px 9px", width: 100,
          background: "var(--bg-1)", border: "1px dashed var(--accent-line)",
          borderRadius: 4, color: "var(--fg-0)",
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="btn btn-ghost mono"
      style={{ height: 26, fontSize: 11, padding: "0 8px", borderStyle: "dashed", color: "var(--fg-3)" }}
    >
      <Icon name="plus" size={10} /> skill
    </button>
  );
}

/* ── Raw text fallback ── */
function RawTextFallback({ rawText, aiState }: { rawText: string; aiState: string }) {
  return (
    <div style={{
      width: 760, maxWidth: "100%",
      background: "var(--bg-1)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "48px 56px 64px",
      position: "relative", boxShadow: "0 40px 60px -30px black",
      alignSelf: "flex-start",
    }}>
      {aiState === "streaming" && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", pointerEvents: "none" }}>
          <div className="scan-shimmer" style={{ position: "absolute", inset: 0 }} />
        </div>
      )}
      {rawText ? (
        <pre style={{
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6,
          color: "var(--fg-1)", margin: 0,
        }}>{rawText}</pre>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 12, color: "var(--fg-3)" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "var(--bg-2)", border: "1px solid var(--line)",
            display: "grid", placeItems: "center", color: "var(--fg-2)",
          }}>
            <Icon name="doc" size={18} />
          </div>
          <span className="mono" style={{ fontSize: 12 }}>no content yet</span>
          <span style={{ fontSize: 12, textAlign: "center", maxWidth: 280 }}>
            Paste your resume text in the editor or type below, then press Start to analyze
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Heat legend ── */
function HeatLegend({ ats }: { ats: ATSAnalysis }) {
  const isReady = ats.score >= 80;
  return (
    <div className="mono" style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--bg-1)", border: "1px solid var(--line)",
      borderRadius: 999, padding: "6px 14px", fontSize: 11,
      boxShadow: "0 20px 30px -20px black",
    }}>
      <span style={{ color: "var(--fg-3)" }}>heatmap</span>
      <LegendChip color="var(--red)" label={isReady ? "—" : "weak"} />
      <LegendChip color="var(--amber)" label={isReady ? "—" : "thin"} />
      <LegendChip color="var(--green)" label="strong" />
      <span style={{ width: 1, height: 12, background: "var(--line)" }} />
      <span style={{ color: "var(--fg-3)" }}>score</span>
      <span style={{ color: ats.score >= 80 ? "var(--green)" : ats.score >= 60 ? "var(--amber)" : "var(--red)" }}>{ats.score}/100</span>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--fg-2)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}
