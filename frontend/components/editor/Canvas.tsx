"use client";

import { useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
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

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-sec="${activeSection}"]`);
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: (el as HTMLElement).offsetTop - 24, behavior: "smooth" });
    }
  }, [activeSection]);

  return (
    <main style={{
      background: "var(--bg-0)",
      display: "flex", flexDirection: "column",
      minHeight: 0,
      borderRight: "1px solid var(--line)",
      position: "relative",
    }}>
      {/* tab strip */}
      <div style={{
        height: 34, display: "flex", alignItems: "center",
        background: "var(--bg-1)",
        borderBottom: "1px solid var(--line)",
        padding: "0 8px",
        gap: 4,
        flexShrink: 0,
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
          <Icon name="flame" size={11} />
          ats heatmap
        </button>
      </div>

      <div ref={scrollRef} style={{
        flex: 1, overflow: "auto",
        display: "flex", justifyContent: "center",
        padding: "32px 36px 60px",
      }}>
        {resume ? (
          <ResumeArticle resume={resume} heatmap={heatmap} aiState={aiState} />
        ) : (
          <RawTextFallback rawText={rawText} aiState={aiState} />
        )}
      </div>

      {heatmap && ats && <HeatLegend ats={ats} />}
    </main>
  );
}

function CanvasTab({ active, label }: { active?: boolean; label: string }) {
  return (
    <div style={{
      position: "relative",
      height: 34,
      padding: "0 14px",
      display: "flex", alignItems: "center", gap: 8,
      background: active ? "var(--bg-0)" : "transparent",
      borderRight: "1px solid var(--line)",
      borderLeft: active ? "1px solid var(--line)" : "1px solid transparent",
      marginBottom: -1,
      fontSize: 12,
      color: active ? "var(--fg-0)" : "var(--fg-2)",
      cursor: "pointer",
    }} className="mono">
      <Icon name="doc" size={12} />
      {label}
      {active && <span style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: "var(--accent)" }} />}
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 6 }}>
      <span className="mono" style={{ color: "var(--fg-3)", fontSize: 11, width: 28, textAlign: "right" }}>{"<>"}</span>
      <span className="mono" style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em",
        color: "var(--accent)", fontWeight: 600,
      }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      {count && <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10.5 }}>{count}</span>}
    </div>
  );
}

function ResumeArticle({ resume, heatmap, aiState }: { resume: ResumeContent; heatmap: boolean; aiState: string }) {
  return (
    <article style={{
      width: 760, maxWidth: "100%",
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 12,
      padding: "48px 56px 56px",
      color: "var(--fg-0)",
      position: "relative",
      boxShadow: "0 40px 60px -30px black",
    }}>
      {/* Streaming shimmer */}
      {aiState === "streaming" && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", pointerEvents: "none" }}>
          <div className="scan-shimmer" style={{ position: "absolute", inset: 0 }} />
        </div>
      )}

      {/* Contact */}
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

      {resume.summary && (
        <>
          <SectionHeader label="Summary" />
          <p data-sec="summary" style={{
            margin: "8px 0 28px",
            padding: heatmap ? "8px 12px" : "0",
            borderRadius: 6,
            color: "var(--fg-1)", lineHeight: 1.6, fontSize: 14,
          }}>{resume.summary}</p>
        </>
      )}

      {resume.experience && resume.experience.length > 0 && (
        <>
          <SectionHeader label="Experience" count={`${resume.experience.length} roles`} />
          <div data-sec="experience" style={{ marginBottom: 28 }}>
            {resume.experience.map((exp, i) => (
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
                  {exp.bullets.map((b, j) => (
                    <li key={j} style={{
                      fontSize: 13, lineHeight: 1.55,
                      color: "var(--fg-1)",
                      padding: heatmap ? "6px 12px 6px 14px" : "3px 0 3px 16px",
                      position: "relative",
                      borderRadius: 4,
                      marginBottom: 2,
                    }}>
                      <span className="mono" style={{
                        position: "absolute", left: heatmap ? 4 : 0, top: heatmap ? 8 : 5,
                        color: "var(--fg-3)", fontSize: 10,
                      }}>›</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {resume.education && resume.education.length > 0 && (
        <>
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
        </>
      )}

      {resume.skills && (
        <>
          <SectionHeader label="Skills" />
          <div data-sec="skills" style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {resume.skills.technical?.map((s) => (
                <span key={s} className="mono" style={{
                  fontSize: 11.5,
                  padding: "3px 9px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  color: "var(--fg-1)",
                }}>{s}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {resume.projects && resume.projects.length > 0 && (
        <>
          <SectionHeader label="Projects" />
          <div data-sec="projects">
            {resume.projects.map((p, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-1)", marginBottom: 6 }}>
                <strong className="mono" style={{ color: "var(--fg-0)" }}>{p.name}</strong> — {p.description}
                {p.technologies && <span className="mono" style={{ color: "var(--fg-3)", fontSize: 12 }}> · {p.technologies.join(" / ")}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function RawTextFallback({ rawText, aiState }: { rawText: string; aiState: string }) {
  return (
    <div style={{
      width: 760, maxWidth: "100%",
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 12,
      padding: "48px 56px 56px",
      position: "relative",
      boxShadow: "0 40px 60px -30px black",
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
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 999,
      padding: "6px 14px",
      fontSize: 11,
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
