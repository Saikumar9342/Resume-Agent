"use client";

import { useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { useResumeStore } from "@/store/resumeStore";
import type { ResumeContent, ATSAnalysis } from "@/types/resume";

type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "projects";

interface CanvasProps {
  resume: ResumeContent | null;
  rawText: string;
  activeSection: SectionId;
  heatmap: boolean;
  onToggleHeatmap: () => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  ats: ATSAnalysis | null;
  onTextChange: (text: string) => void;
}

export function Canvas({ resume, rawText, activeSection, heatmap, onToggleHeatmap, aiState, ats }: CanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ai } = useResumeStore();

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-sec="${activeSection}"]`);
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: (el as HTMLElement).offsetTop - 24, behavior: "smooth" });
    }
  }, [activeSection]);

  // Auto-scroll to streaming section
  useEffect(() => {
    if (ai.streamingSection) {
      const el = scrollRef.current?.querySelector(`[data-sec="${ai.streamingSection}"]`);
      if (el && scrollRef.current) {
        scrollRef.current.scrollTo({ top: (el as HTMLElement).offsetTop - 24, behavior: "smooth" });
      }
    }
  }, [ai.streamingSection]);

  const hasContent = resume && (resume.contact?.name || resume.summary || resume.experience?.length);

  return (
    <main style={{
      background: "var(--bg-0)",
      display: "flex", flexDirection: "column",
      minHeight: 0, height: "100%",
      borderRight: "1px solid var(--line)",
    }}>
      {/* tab strip */}
      <div style={{
        height: 34, display: "flex", alignItems: "center",
        background: "var(--bg-1)",
        borderBottom: "1px solid var(--line)",
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
            resume={resume}
            heatmap={heatmap}
            aiState={aiState}
            streamingSection={ai.streamingSection}
            sectionTokens={ai.sectionTokens}
            ats={ats}
          />
        ) : (
          <RawTextFallback rawText={rawText} aiState={aiState} />
        )}
        {/* Spacer so content doesn't hide behind legend */}
        <div style={{ height: heatmap && ats ? 80 : 48, flexShrink: 0 }} />
      </div>

      {/* HeatLegend — sticky at bottom of canvas, outside scroll so it never overlaps */}
      {heatmap && ats && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          padding: "12px 0 14px",
          background: "linear-gradient(to top, var(--bg-0) 60%, transparent)",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          <HeatLegend ats={ats} />
        </div>
      )}
    </main>
  );
}

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

function SectionHeader({ label, count }: { label: string; count?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 6 }}>
      <span className="mono" style={{ color: "var(--fg-3)", fontSize: 11, width: 28, textAlign: "right" }}>{"<>"}</span>
      <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)", fontWeight: 600 }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      {count && <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10.5 }}>{count}</span>}
    </div>
  );
}

interface ArticleProps {
  resume: ResumeContent;
  heatmap: boolean;
  aiState: string;
  streamingSection: string | null;
  sectionTokens: Record<string, string>;
  ats: ATSAnalysis | null;
}

function sectionStyle(sec: string, streamingSection: string | null, isStreaming: boolean): React.CSSProperties {
  if (!isStreaming || !streamingSection) return {};
  const isActive = streamingSection === sec;
  return {
    transition: "filter 0.4s ease, opacity 0.4s ease",
    filter: isActive ? "none" : "blur(2px)",
    opacity: isActive ? 1 : 0.35,
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

function ResumeArticle({ resume, heatmap, aiState, streamingSection, sectionTokens, ats }: ArticleProps) {
  const isStreaming = aiState === "streaming";
  const missingKw = ats?.missing_keywords ?? [];

  return (
    <article style={{
      width: 760, maxWidth: "100%",
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 12,
      padding: "48px 56px 64px",
      color: "var(--fg-0)",
      position: "relative",
      boxShadow: "0 40px 60px -30px black",
      alignSelf: "flex-start",
    }}>
      {/* Contact — always visible, no blur */}
      <header data-sec="contact" style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
          {resume.contact?.name || "Your Name"}
        </h1>
        <div className="mono" style={{ display: "flex", gap: 14, color: "var(--fg-2)", fontSize: 11.5, marginTop: 12, flexWrap: "wrap" }}>
          {resume.contact?.email && <span>{resume.contact.email}</span>}
          {resume.contact?.phone && <><span style={{ color: "var(--fg-4)" }}>·</span><span>{resume.contact.phone}</span></>}
          {resume.contact?.location && <><span style={{ color: "var(--fg-4)" }}>·</span><span>{resume.contact.location}</span></>}
          {resume.contact?.github && <><span style={{ color: "var(--fg-4)" }}>·</span><span>{resume.contact.github}</span></>}
        </div>
      </header>

      {/* Summary */}
      {(resume.summary || sectionTokens["summary"]) && (
        <div style={sectionStyle("summary", streamingSection, isStreaming)}>
          <SectionHeader label="Summary" />
          <p data-sec="summary" style={{
            margin: "8px 0 28px", padding: heatmap ? "8px 12px" : "0",
            borderRadius: 6, color: "var(--fg-1)", lineHeight: 1.6, fontSize: 14,
          }}>
            {streamingSection === "summary"
              ? <StreamingText text={sectionTokens["summary"] ?? ""} />
              : resume.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {((resume.experience && resume.experience.length > 0) || streamingSection === "experience") && (
        <div style={sectionStyle("experience", streamingSection, isStreaming)}>
          <SectionHeader label="Experience" count={resume.experience ? `${resume.experience.length} roles` : undefined} />
          <div data-sec="experience" style={{ marginBottom: 28 }}>
            {resume.experience?.map((exp, i) => (
              <div key={i} style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>{exp.company}</div>
                    <div style={{ fontSize: 13, color: "var(--fg-1)" }}>{exp.title}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)", textAlign: "right", flexShrink: 0 }}>
                    {exp.start} — {exp.end}
                  </div>
                </div>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
                  {exp.bullets.map((b, j) => {
                    const heat = heatmap ? bulletHeat(b, missingKw) : null;
                    return (
                    <li key={j} style={{
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
                    }}>
                      <span className="mono" style={{ position: "absolute", left: heatmap ? 6 : 0, top: heatmap ? 8 : 5, color: heat ? `var(--${heat})` : "var(--fg-3)", fontSize: 10 }}>›</span>
                      {streamingSection === "experience" && i === (resume.experience?.length ?? 1) - 1 && j === (exp.bullets.length - 1)
                        ? <StreamingText text={b} />
                        : b}
                    </li>
                    );
                  })}
                  {/* Show live tokens for experience as an extra bullet */}
                  {streamingSection === "experience" && sectionTokens["experience"] && i === (resume.experience?.length ?? 1) - 1 && (
                    <li style={{ fontSize: 13, lineHeight: 1.55, color: "var(--fg-1)", padding: "3px 0 3px 16px", position: "relative" }}>
                      <span className="mono" style={{ position: "absolute", left: 0, top: 5, color: "var(--accent)", fontSize: 10 }}>›</span>
                      <StreamingText text={sectionTokens["experience"]} />
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <div style={sectionStyle("education", streamingSection, isStreaming)}>
          <SectionHeader label="Education" />
          <div data-sec="education" style={{ marginBottom: 28 }}>
            {resume.education.map((edu, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-1)", padding: "4px 0" }}>
                <span>
                  <strong style={{ fontWeight: 600, color: "var(--fg-0)" }}>{edu.institution}</strong>
                  {edu.degree && <> — {edu.degree} {edu.field}</>}
                </span>
                <span className="mono" style={{ color: "var(--fg-3)", fontSize: 12 }}>{edu.year}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(resume.skills || streamingSection === "skills") && (
        <div style={sectionStyle("skills", streamingSection, isStreaming)}>
          <SectionHeader label="Skills" />
          <div data-sec="skills" style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {resume.skills?.technical?.map((s) => (
                <span key={s} className="mono" style={{
                  fontSize: 11.5, padding: "3px 9px",
                  background: "var(--bg-2)", border: "1px solid var(--line)",
                  borderRadius: 4, color: "var(--fg-1)",
                }}>{s}</span>
              ))}
              {/* Live skill tokens during streaming */}
              {streamingSection === "skills" && sectionTokens["skills"] && (
                <span className="mono" style={{
                  fontSize: 11.5, padding: "3px 9px",
                  background: "color-mix(in oklch, var(--accent) 12%, var(--bg-2))",
                  border: "1px solid var(--accent-line)",
                  borderRadius: 4, color: "var(--accent)",
                }}>
                  {sectionTokens["skills"]}
                  <span className="caret" style={{ display: "inline-block", width: 6, height: "0.85em", background: "var(--accent)", marginLeft: 2, verticalAlign: "text-bottom", borderRadius: 1 }} />
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Projects */}
      {((resume.projects && resume.projects.length > 0) || streamingSection === "projects") && (
        <div style={sectionStyle("projects", streamingSection, isStreaming)}>
          <SectionHeader label="Projects" />
          <div data-sec="projects">
            {resume.projects?.map((p, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-1)", marginBottom: 6 }}>
                <strong className="mono" style={{ color: "var(--fg-0)" }}>{p.name}</strong> — {p.description}
                {p.technologies && <span className="mono" style={{ color: "var(--fg-3)", fontSize: 12 }}> · {p.technologies.join(" / ")}</span>}
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
