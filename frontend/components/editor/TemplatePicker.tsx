"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ResumeContent } from "@/types/resume";

export type TemplateId = "minimal" | "classic" | "modern";

interface TemplatePickerProps {
  current: TemplateId;
  resume: ResumeContent;
  onSelect: (t: TemplateId) => void;
  onClose: () => void;
}

const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "minimal", name: "Minimal", desc: "Clean, whitespace-first. No frills, maximum readability." },
  { id: "classic", name: "Classic", desc: "Traditional serif layout. ATS-safe, recruiter-familiar." },
  { id: "modern", name: "Modern", desc: "Two-column with accent sidebar. Bold, design-forward." },
];

export function TemplatePicker({ current, resume, onSelect, onClose }: TemplatePickerProps) {
  const [hovered, setHovered] = useState<TemplateId | null>(null);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--line)",
        borderRadius: 14, width: 900, maxWidth: "95vw", maxHeight: "85vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 40px 80px -20px black",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>templates</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Choose a resume layout</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: 24, overflow: "auto" }}>
          {TEMPLATES.map(t => {
            const active = current === t.id;
            const isHov = hovered === t.id;
            return (
              <div
                key={t.id}
                onClick={() => { onSelect(t.id); onClose(); }}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  cursor: "pointer",
                  borderRadius: 10,
                  border: `2px solid ${active ? "var(--accent)" : isHov ? "var(--line)" : "var(--line-soft)"}`,
                  overflow: "hidden",
                  background: "var(--bg-0)",
                  transition: "border-color 120ms, box-shadow 120ms",
                  boxShadow: active ? "0 0 0 3px var(--accent-soft)" : isHov ? "0 4px 20px -8px black" : "none",
                }}
              >
                {/* Preview thumbnail */}
                <div style={{ height: 260, overflow: "hidden", background: "white", position: "relative" }}>
                  <div style={{ transform: "scale(0.42)", transformOrigin: "top left", width: "238%", pointerEvents: "none" }}>
                    <TemplatePreview id={t.id} resume={resume} />
                  </div>
                  {active && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      background: "var(--accent)", color: "var(--bg-0)",
                      borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                    }} className="mono">active</div>
                  )}
                </div>
                {/* Label */}
                <div style={{ padding: "12px 14px", borderTop: "1px solid var(--line)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Inline previews (scaled down thumbnails) ── */
function TemplatePreview({ id, resume }: { id: TemplateId; resume: ResumeContent }) {
  switch (id) {
    case "minimal": return <MinimalTemplate resume={resume} />;
    case "classic": return <ClassicTemplate resume={resume} />;
    case "modern": return <ModernTemplate resume={resume} />;
  }
}

/* ─────────────────────────────────────────────
   MINIMAL — lots of whitespace, simple lines
───────────────────────────────────────────── */
export function MinimalTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  const contactParts = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean);
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, lineHeight: 1.6, color: "#1a1a1a", padding: "48px 56px", background: "white", minHeight: 800 }}>
      <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: "-0.5px", margin: "0 0 6px", color: "#000" }}>{contact.name || "Your Name"}</h1>
      <div style={{ fontSize: 10.5, color: "#666", marginBottom: 32, letterSpacing: "0.02em" }}>
        {contactParts.join("  ·  ")}
      </div>

      {c.summary && (
        <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "#999", marginBottom: 8 }}>Summary</div>
          <p style={{ fontSize: 11.5, color: "#333", marginBottom: 28, lineHeight: 1.65 }}>{c.summary}</p>
        </>
      )}

      {c.experience && c.experience.length > 0 && (
        <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "#999", marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 6 }}>Experience</div>
          {c.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{e.company}</span>
                <span style={{ fontSize: 10, color: "#888" }}>{e.start} – {e.end}</span>
              </div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 5, fontStyle: "italic" }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 14, color: "#333" }}>
                {(e.bullets ?? []).slice(0, 3).map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>
      )}

      {c.education && c.education.length > 0 && (
        <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "#999", marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 6, marginTop: 8 }}>Education</div>
          {c.education.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{e.institution}</div>
                <div style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
              </div>
              <span style={{ fontSize: 10, color: "#888" }}>{e.year}</span>
            </div>
          ))}
        </>
      )}

      {c.skills?.technical && c.skills.technical.length > 0 && (
        <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "#999", marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 6, marginTop: 8 }}>Skills</div>
          <div style={{ fontSize: 11, color: "#444", lineHeight: 1.7 }}>{c.skills.technical.join("  ·  ")}</div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CLASSIC — serif, traditional, ATS-safe
───────────────────────────────────────────── */
export function ClassicTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  const contactParts = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean);
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 12, lineHeight: 1.55, color: "#111", padding: "44px 52px", background: "white", minHeight: 800 }}>
      <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #111", paddingBottom: 14 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.3px" }}>{contact.name || "Your Name"}</h1>
        <div style={{ fontSize: 10.5, color: "#444", fontFamily: "Arial, sans-serif" }}>{contactParts.join("  |  ")}</div>
      </div>

      {c.summary && (
        <>
          <SectionTitleClassic>Professional Summary</SectionTitleClassic>
          <p style={{ fontSize: 11.5, marginBottom: 14 }}>{c.summary}</p>
        </>
      )}

      {c.experience && c.experience.length > 0 && (
        <>
          <SectionTitleClassic>Professional Experience</SectionTitleClassic>
          {c.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 12 }}>{e.company}</strong>
                <span style={{ fontSize: 10.5, fontFamily: "Arial, sans-serif", color: "#555" }}>{e.start} – {e.end}</span>
              </div>
              <div style={{ fontSize: 11.5, fontStyle: "italic", color: "#444", marginBottom: 4 }}>{e.title}</div>
              <ul style={{ margin: "0 0 4px", paddingLeft: 16 }}>
                {(e.bullets ?? []).slice(0, 3).map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>
      )}

      {c.education && c.education.length > 0 && (
        <>
          <SectionTitleClassic>Education</SectionTitleClassic>
          {c.education.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <strong>{e.institution}</strong>
                <div style={{ fontSize: 11, fontStyle: "italic", color: "#444" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
              </div>
              <span style={{ fontSize: 10.5, fontFamily: "Arial, sans-serif", color: "#555" }}>{e.year}</span>
            </div>
          ))}
        </>
      )}

      {c.skills?.technical && c.skills.technical.length > 0 && (
        <>
          <SectionTitleClassic>Technical Skills</SectionTitleClassic>
          <p style={{ fontSize: 11, lineHeight: 1.7 }}>{c.skills.technical.join(" · ")}</p>
        </>
      )}
    </div>
  );
}

function SectionTitleClassic({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em",
      fontFamily: "Arial, sans-serif", fontWeight: 700,
      borderBottom: "1px solid #aaa", paddingBottom: 3,
      margin: "14px 0 8px", color: "#333",
    }}>{children}</div>
  );
}

/* ─────────────────────────────────────────────
   MODERN — two-column, accent sidebar
───────────────────────────────────────────── */
export function ModernTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  const ACCENT = "#1a56db";
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, lineHeight: 1.55, color: "#1a1a1a", background: "white", minHeight: 800, display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 200, background: ACCENT, color: "white", padding: "40px 22px", flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, marginBottom: 6, wordBreak: "break-word" }}>{contact.name || "Your Name"}</div>
        <div style={{ fontSize: 9, opacity: 0.75, marginBottom: 24, lineHeight: 1.7 }}>
          {[contact.email, contact.phone, contact.location, contact.linkedin].filter(Boolean).map((v, i) => (
            <div key={i}>{v}</div>
          ))}
        </div>

        {c.skills?.technical && c.skills.technical.length > 0 && (
          <>
            <SidebarTitle>Skills</SidebarTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {c.skills.technical.slice(0, 12).map((s, i) => (
                <span key={i} style={{ fontSize: 9, background: "rgba(255,255,255,0.18)", borderRadius: 3, padding: "2px 6px" }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {c.education && c.education.length > 0 && (
          <>
            <SidebarTitle>Education</SidebarTitle>
            {c.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 10, fontSize: 10 }}>
                <div style={{ fontWeight: 600 }}>{e.institution}</div>
                <div style={{ opacity: 0.8 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ opacity: 0.65 }}>{e.year}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "40px 36px" }}>
        {c.summary && (
          <>
            <MainTitle accent={ACCENT}>Summary</MainTitle>
            <p style={{ fontSize: 11.5, color: "#333", marginBottom: 20, lineHeight: 1.65 }}>{c.summary}</p>
          </>
        )}

        {c.experience && c.experience.length > 0 && (
          <>
            <MainTitle accent={ACCENT}>Experience</MainTitle>
            {c.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{e.company}</span>
                  <span style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>{e.start} – {e.end}</span>
                </div>
                <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 4 }}>{e.title}</div>
                <ul style={{ margin: 0, paddingLeft: 14 }}>
                  {(e.bullets ?? []).slice(0, 3).map((b, j) => <li key={j} style={{ fontSize: 11, color: "#444", marginBottom: 2 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </>
        )}

        {c.projects && c.projects.length > 0 && (
          <>
            <MainTitle accent={ACCENT}>Projects</MainTitle>
            {c.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 11.5 }}>{p.name}</span>
                {p.technologies?.length > 0 && <span style={{ fontSize: 10, color: "#888", marginLeft: 8 }}>{p.technologies.join(", ")}</span>}
                {p.description && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{p.description}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SidebarTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, opacity: 0.65, borderBottom: "1px solid rgba(255,255,255,0.25)", paddingBottom: 4, margin: "18px 0 8px" }}>
      {children}
    </div>
  );
}

function MainTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, margin: "0 0 10px" }}>
      {children}
    </div>
  );
}
