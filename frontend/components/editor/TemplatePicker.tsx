"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ResumeContent } from "@/types/resume";

export type TemplateId = "minimal" | "classic" | "modern" | "executive" | "compact" | "creative";

interface TemplatePickerProps {
  current: TemplateId;
  resume: ResumeContent;
  onSelect: (t: TemplateId) => void;
  onClose: () => void;
}

const TEMPLATES: { id: TemplateId; name: string; desc: string; tag?: string }[] = [
  { id: "minimal",   name: "Minimal",   desc: "Clean, whitespace-first. Maximum readability." },
  { id: "classic",   name: "Classic",   desc: "Traditional serif. ATS-safe, recruiter-familiar.", tag: "ATS Best" },
  { id: "modern",    name: "Modern",    desc: "Two-column accent sidebar. Bold, design-forward." },
  { id: "executive", name: "Executive", desc: "Premium single-column. Senior roles & leadership.", tag: "Premium" },
  { id: "compact",   name: "Compact",   desc: "Dense layout. Fits more on one page.", tag: "1-Page" },
  { id: "creative",  name: "Creative",  desc: "Colorful header band. Stand out in creative fields." },
];

export function TemplatePicker({ current, resume, onSelect, onClose }: TemplatePickerProps) {
  const [hovered, setHovered] = useState<TemplateId | null>(null);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--line)",
        borderRadius: 14, width: 1000, maxWidth: "96vw", maxHeight: "88vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 40px 80px -20px black",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>templates</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>Choose a resume layout</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* Grid */}
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
                  cursor: "pointer", borderRadius: 10, overflow: "hidden",
                  border: `2px solid ${active ? "var(--accent)" : isHov ? "var(--fg-3)" : "var(--line)"}`,
                  background: "white",
                  transition: "border-color 120ms, box-shadow 120ms",
                  boxShadow: active ? "0 0 0 3px var(--accent-soft)" : isHov ? "0 8px 24px -8px black" : "none",
                }}
              >
                {/* Thumbnail */}
                <div style={{ height: 240, overflow: "hidden", background: "white", position: "relative" }}>
                  <div style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "263%", pointerEvents: "none" }}>
                    <TemplatePreview id={t.id} resume={resume} />
                  </div>
                  {active && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: "var(--accent)", color: "var(--bg-0)",
                      borderRadius: 99, padding: "2px 9px", fontSize: 10, fontWeight: 700,
                    }} className="mono">active</div>
                  )}
                  {t.tag && !active && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: "rgba(0,0,0,0.75)", color: "white",
                      borderRadius: 99, padding: "2px 8px", fontSize: 9.5, fontWeight: 600,
                    }} className="mono">{t.tag}</div>
                  )}
                </div>
                {/* Label */}
                <div style={{ padding: "10px 13px", borderTop: "1px solid #eee", background: "var(--bg-1)" }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 2, color: "var(--fg-0)" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TemplatePreview({ id, resume }: { id: TemplateId; resume: ResumeContent }) {
  switch (id) {
    case "minimal":   return <MinimalTemplate resume={resume} />;
    case "classic":   return <ClassicTemplate resume={resume} />;
    case "modern":    return <ModernTemplate resume={resume} />;
    case "executive": return <ExecutiveTemplate resume={resume} />;
    case "compact":   return <CompactTemplate resume={resume} />;
    case "creative":  return <CreativeTemplate resume={resume} />;
  }
}

/* ── Shared helpers ── */
function contactLine(contact: ResumeContent["contact"], sep = "  ·  ") {
  return [contact?.email, contact?.phone, contact?.location, contact?.linkedin, contact?.github]
    .filter(Boolean).join(sep);
}

function allSkills(c: ResumeContent) {
  return [...(c.skills?.technical ?? []), ...(c.skills?.soft ?? [])];
}

/* ══════════════════════════════════════════════
   1. MINIMAL — clean, light, lots of space
══════════════════════════════════════════════ */
export function MinimalTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, lineHeight: 1.65, color: "#1a1a1a", padding: "52px 60px", background: "white", minHeight: 1000 }}>
      <h1 style={{ fontSize: 30, fontWeight: 300, letterSpacing: "-0.5px", margin: "0 0 5px", color: "#000" }}>{contact.name || "Your Name"}</h1>
      <div style={{ fontSize: 10, color: "#777", marginBottom: 34, letterSpacing: "0.02em" }}>{contactLine(contact)}</div>

      {c.summary && <Section label="Summary"><p style={{ margin: 0, color: "#444", fontSize: 11 }}>{c.summary}</p></Section>}

      {(c.experience ?? []).length > 0 && (
        <Section label="Experience">
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, fontSize: 11.5 }}>{e.company}</span>
                <span style={{ fontSize: 10, color: "#999" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "#666", fontStyle: "italic", marginBottom: 4 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 14, color: "#333" }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: 10.5, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {(c.projects ?? []).length > 0 && (
        <Section label="Projects">
          {(c.projects ?? []).map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: 11 }}>{p.name}</span>
                {p.url && <span style={{ fontSize: 9.5, color: "#888" }}>{p.url}</span>}
              </div>
              {p.technologies?.length > 0 && <div style={{ fontSize: 9.5, color: "#888", marginBottom: 2 }}>{p.technologies.join(", ")}</div>}
              {p.description && <div style={{ fontSize: 10.5, color: "#555" }}>{p.description}</div>}
            </div>
          ))}
        </Section>
      )}

      {(c.education ?? []).length > 0 && (
        <Section label="Education">
          {(c.education ?? []).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 11.5 }}>{e.institution}</div>
                <div style={{ fontSize: 10.5, color: "#666", fontStyle: "italic" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
              </div>
              <span style={{ fontSize: 10, color: "#999" }}>{e.year}</span>
            </div>
          ))}
        </Section>
      )}

      {allSkills(c).length > 0 && (
        <Section label="Skills">
          <div style={{ fontSize: 10.5, color: "#444", lineHeight: 1.8 }}>{allSkills(c).join("  ·  ")}</div>
        </Section>
      )}

      {(c.certifications ?? []).length > 0 && (
        <Section label="Certifications">
          {(c.certifications ?? []).map((cert, i) => (
            <div key={i} style={{ fontSize: 10.5, color: "#444", marginBottom: 3 }}>· {typeof cert === "string" ? cert : (cert as any).name ?? JSON.stringify(cert)}</div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.2em", color: "#bbb", marginBottom: 10, borderBottom: "1px solid #f0f0f0", paddingBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════
   2. CLASSIC — serif, ATS-safe, traditional
══════════════════════════════════════════════ */
export function ClassicTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 11.5, lineHeight: 1.55, color: "#111", padding: "44px 52px", background: "white", minHeight: 1000 }}>
      <div style={{ textAlign: "center", marginBottom: 16, borderBottom: "2px solid #111", paddingBottom: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 5px" }}>{contact.name || "Your Name"}</h1>
        <div style={{ fontSize: 10, color: "#444", fontFamily: "Arial, sans-serif" }}>{contactLine(contact, "  |  ")}</div>
      </div>

      {c.summary && <><ClassicTitle>Professional Summary</ClassicTitle><p style={{ fontSize: 11, marginBottom: 12, margin: "0 0 12px" }}>{c.summary}</p></>}

      {(c.experience ?? []).length > 0 && (
        <><ClassicTitle>Professional Experience</ClassicTitle>
        {(c.experience ?? []).map((e, i) => (
          <div key={i} style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 11.5 }}>{e.company}</strong>
              <span style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: "#555" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
            </div>
            <div style={{ fontSize: 11, fontStyle: "italic", color: "#444", marginBottom: 3 }}>{e.title}</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: 10.5, marginBottom: 2 }}>{b}</li>)}
            </ul>
          </div>
        ))}</>
      )}

      {(c.projects ?? []).length > 0 && (
        <><ClassicTitle>Projects</ClassicTitle>
        {(c.projects ?? []).map((p, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 11 }}>{p.name}</strong>
              {p.url && <span style={{ fontSize: 9.5, color: "#666", fontFamily: "Arial, sans-serif" }}>{p.url}</span>}
            </div>
            {p.technologies?.length > 0 && <div style={{ fontSize: 10, color: "#666", fontStyle: "italic" }}>{p.technologies.join(", ")}</div>}
            {p.description && <div style={{ fontSize: 10.5 }}>{p.description}</div>}
          </div>
        ))}</>
      )}

      {(c.education ?? []).length > 0 && (
        <><ClassicTitle>Education</ClassicTitle>
        {(c.education ?? []).map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <strong>{e.institution}</strong>
              <div style={{ fontSize: 10.5, fontStyle: "italic", color: "#444" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
            </div>
            <span style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: "#555" }}>{e.year}</span>
          </div>
        ))}</>
      )}

      {allSkills(c).length > 0 && (
        <><ClassicTitle>Technical Skills</ClassicTitle>
        <p style={{ fontSize: 10.5, lineHeight: 1.7, margin: 0 }}>{allSkills(c).join(" · ")}</p></>
      )}

      {(c.certifications ?? []).length > 0 && (
        <><ClassicTitle>Certifications</ClassicTitle>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {(c.certifications ?? []).map((cert, i) => (
            <li key={i} style={{ fontSize: 10.5, marginBottom: 2 }}>{typeof cert === "string" ? cert : (cert as any).name ?? ""}</li>
          ))}
        </ul></>
      )}
    </div>
  );
}

function ClassicTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "Arial, sans-serif", fontWeight: 700, borderBottom: "1px solid #999", paddingBottom: 3, margin: "14px 0 7px", color: "#222" }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   3. MODERN — two-column, accent sidebar
══════════════════════════════════════════════ */
export function ModernTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  const ACC = "#1a56db";
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, lineHeight: 1.55, color: "#1a1a1a", background: "white", minHeight: 1000, display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 195, background: ACC, color: "white", padding: "36px 18px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginBottom: 5, wordBreak: "break-word" }}>{contact.name || "Your Name"}</div>
        <div style={{ fontSize: 8.5, opacity: 0.8, lineHeight: 1.8, marginBottom: 20 }}>
          {[contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
        </div>

        {allSkills(c).length > 0 && <>
          <SbTitle>Skills</SbTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 16 }}>
            {allSkills(c).map((s, i) => <span key={i} style={{ fontSize: 8.5, background: "rgba(255,255,255,0.18)", borderRadius: 3, padding: "2px 5px" }}>{s}</span>)}
          </div>
        </>}

        {(c.education ?? []).length > 0 && <>
          <SbTitle>Education</SbTitle>
          {(c.education ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: 10, fontSize: 9.5 }}>
              <div style={{ fontWeight: 600 }}>{e.institution}</div>
              <div style={{ opacity: 0.8 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
              <div style={{ opacity: 0.65 }}>{e.year}</div>
            </div>
          ))}
        </>}

        {(c.certifications ?? []).length > 0 && <>
          <SbTitle>Certifications</SbTitle>
          {(c.certifications ?? []).map((cert, i) => (
            <div key={i} style={{ fontSize: 9, opacity: 0.85, marginBottom: 4 }}>{typeof cert === "string" ? cert : (cert as any).name ?? ""}</div>
          ))}
        </>}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "36px 32px" }}>
        {c.summary && <><MnTitle acc={ACC}>Summary</MnTitle><p style={{ fontSize: 11, color: "#444", margin: "0 0 16px", lineHeight: 1.65 }}>{c.summary}</p></>}

        {(c.experience ?? []).length > 0 && <>
          <MnTitle acc={ACC}>Experience</MnTitle>
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 11.5 }}>{e.company}</span>
                <span style={{ fontSize: 9.5, color: "#888" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: 10.5, color: ACC, fontWeight: 600, marginBottom: 3 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 13 }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: 10.5, color: "#444", marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>}

        {(c.projects ?? []).length > 0 && <>
          <MnTitle acc={ACC}>Projects</MnTitle>
          {(c.projects ?? []).map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 11 }}>{p.name}</span>
                {p.url && <span style={{ fontSize: 9, color: "#888" }}>{p.url}</span>}
              </div>
              {p.technologies?.length > 0 && <div style={{ fontSize: 9.5, color: "#888" }}>{p.technologies.join(", ")}</div>}
              {p.description && <div style={{ fontSize: 10.5, color: "#555", marginTop: 2 }}>{p.description}</div>}
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

function SbTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, opacity: 0.6, borderBottom: "1px solid rgba(255,255,255,0.25)", paddingBottom: 4, margin: "0 0 8px" }}>{children}</div>;
}
function MnTitle({ children, acc }: { children: React.ReactNode; acc: string }) {
  return <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, color: acc, borderBottom: `2px solid ${acc}`, paddingBottom: 3, margin: "0 0 9px" }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   4. EXECUTIVE — premium, understated, leadership
══════════════════════════════════════════════ */
export function ExecutiveTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  return (
    <div style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 11.5, lineHeight: 1.65, color: "#1c1c1c", padding: "52px 64px", background: "white", minHeight: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 400, letterSpacing: "0.04em", margin: "0 0 4px", color: "#000", textTransform: "uppercase" }}>{contact.name || "Your Name"}</h1>
        <div style={{ width: 48, height: 2, background: "#8B6914", margin: "8px 0 12px" }} />
        <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.04em", fontFamily: "Arial, sans-serif" }}>{contactLine(contact, "   ·   ")}</div>
      </div>

      {c.summary && (
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #e8e0d0" }}>
          <p style={{ fontSize: 11.5, color: "#333", fontStyle: "italic", margin: 0, lineHeight: 1.75 }}>{c.summary}</p>
        </div>
      )}

      {(c.experience ?? []).length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <ExecTitle>Professional Experience</ExecTitle>
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{e.company}</span>
                <span style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: "#888", fontStyle: "italic" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: 11, color: "#8B6914", fontStyle: "italic", marginBottom: 5 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 18, listStyleType: "disc" }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 3, color: "#333" }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          {(c.education ?? []).length > 0 && <>
            <ExecTitle>Education</ExecTitle>
            {(c.education ?? []).map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 11.5 }}>{e.institution}</div>
                <div style={{ fontSize: 11, fontStyle: "italic", color: "#555" }}>{e.degree}{e.field ? `, ${e.field}` : ""}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{e.year}</div>
              </div>
            ))}
          </>}
          {(c.certifications ?? []).length > 0 && <>
            <ExecTitle>Certifications</ExecTitle>
            {(c.certifications ?? []).map((cert, i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 3, color: "#444" }}>· {typeof cert === "string" ? cert : (cert as any).name ?? ""}</div>
            ))}
          </>}
        </div>
        <div>
          {allSkills(c).length > 0 && <>
            <ExecTitle>Core Competencies</ExecTitle>
            <div style={{ fontSize: 10.5, color: "#444", lineHeight: 2 }}>{allSkills(c).join("  ·  ")}</div>
          </>}
          {(c.projects ?? []).length > 0 && <>
            <ExecTitle>Key Projects</ExecTitle>
            {(c.projects ?? []).map((p, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ fontWeight: 600, fontSize: 11 }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 10.5, color: "#555" }}>{p.description}</div>}
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

function ExecTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.18em", color: "#8B6914", fontFamily: "Arial, sans-serif", fontWeight: 700, borderBottom: "1px solid #e8e0d0", paddingBottom: 4, margin: "14px 0 8px" }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   5. COMPACT — dense, fits everything on 1 page
══════════════════════════════════════════════ */
export function CompactTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10.5, lineHeight: 1.45, color: "#111", padding: "28px 36px", background: "white", minHeight: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid #222" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>{contact.name || "Your Name"}</h1>
          {c.experience?.[0]?.title && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{c.experience[0].title}</div>}
        </div>
        <div style={{ fontSize: 9, color: "#555", textAlign: "right", lineHeight: 1.8 }}>
          {[contact.email, contact.phone, contact.location].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
          {[contact.linkedin, contact.github].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
        </div>
      </div>

      {c.summary && <><CpTitle>Summary</CpTitle><p style={{ fontSize: 10, margin: "0 0 8px", color: "#333", lineHeight: 1.5 }}>{c.summary}</p></>}

      {(c.experience ?? []).length > 0 && <>
        <CpTitle>Experience</CpTitle>
        {(c.experience ?? []).map((e, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 10.5 }}>{e.company} <span style={{ fontWeight: 400, fontStyle: "italic", color: "#555" }}>— {e.title}</span></span>
              <span style={{ fontSize: 9.5, color: "#888" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
            </div>
            <ul style={{ margin: "3px 0 0", paddingLeft: 14 }}>
              {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: 10, marginBottom: 1 }}>{b}</li>)}
            </ul>
          </div>
        ))}
      </>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          {(c.education ?? []).length > 0 && <>
            <CpTitle>Education</CpTitle>
            {(c.education ?? []).map((e, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <div style={{ fontWeight: 600, fontSize: 10.5 }}>{e.institution}</div>
                <div style={{ fontSize: 10, color: "#555" }}>{e.degree}{e.field ? ` in ${e.field}` : ""} {e.year ? `· ${e.year}` : ""}</div>
              </div>
            ))}
          </>}
          {(c.certifications ?? []).length > 0 && <>
            <CpTitle>Certifications</CpTitle>
            {(c.certifications ?? []).map((cert, i) => (
              <div key={i} style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>· {typeof cert === "string" ? cert : (cert as any).name ?? ""}</div>
            ))}
          </>}
        </div>
        <div>
          {allSkills(c).length > 0 && <>
            <CpTitle>Skills</CpTitle>
            <div style={{ fontSize: 10, color: "#444", lineHeight: 1.7 }}>{allSkills(c).join(" · ")}</div>
          </>}
          {(c.projects ?? []).length > 0 && <>
            <CpTitle>Projects</CpTitle>
            {(c.projects ?? []).map((p, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <span style={{ fontWeight: 600, fontSize: 10.5 }}>{p.name}</span>
                {p.technologies?.length > 0 && <span style={{ fontSize: 9.5, color: "#888" }}> · {p.technologies.join(", ")}</span>}
                {p.description && <div style={{ fontSize: 10, color: "#555" }}>{p.description}</div>}
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

function CpTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, color: "#222", borderBottom: "1px solid #ddd", paddingBottom: 2, margin: "8px 0 5px" }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   6. CREATIVE — bold header band, colorful
══════════════════════════════════════════════ */
export function CreativeTemplate({ resume: c }: { resume: ResumeContent }) {
  const contact = c.contact ?? {};
  const ACC = "#7c3aed";
  const ACC2 = "#a78bfa";
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, lineHeight: 1.6, color: "#1f1f1f", background: "white", minHeight: 1000 }}>
      {/* Bold header */}
      <div style={{ background: `linear-gradient(135deg, ${ACC} 0%, #4f46e5 100%)`, color: "white", padding: "36px 44px 28px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" }}>{contact.name || "Your Name"}</h1>
        {c.experience?.[0]?.title && <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10, fontWeight: 300 }}>{c.experience[0].title}</div>}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 9.5, opacity: 0.8, marginTop: 8 }}>
          {[contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean).map((v, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>· {v}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 44px" }}>
        {c.summary && <><CrTitle acc={ACC}>About Me</CrTitle><p style={{ fontSize: 11, color: "#444", margin: "0 0 18px", lineHeight: 1.7 }}>{c.summary}</p></>}

        {(c.experience ?? []).length > 0 && <>
          <CrTitle acc={ACC}>Experience</CrTitle>
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: 16, paddingLeft: 12, borderLeft: `3px solid ${ACC2}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{e.company}</span>
                <span style={{ fontSize: 9.5, color: "#999", fontStyle: "italic" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: 10.5, color: ACC, fontWeight: 600, marginBottom: 4 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 14 }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: 10.5, color: "#444", marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 4 }}>
          <div>
            {(c.education ?? []).length > 0 && <>
              <CrTitle acc={ACC}>Education</CrTitle>
              {(c.education ?? []).map((e, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 11.5 }}>{e.institution}</div>
                  <div style={{ fontSize: 10.5, color: "#666" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                  <div style={{ fontSize: 10, color: "#aaa" }}>{e.year}</div>
                </div>
              ))}
            </>}
            {(c.certifications ?? []).length > 0 && <>
              <CrTitle acc={ACC}>Certifications</CrTitle>
              {(c.certifications ?? []).map((cert, i) => (
                <div key={i} style={{ fontSize: 10.5, color: "#555", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: ACC2, flexShrink: 0, display: "inline-block" }} />
                  {typeof cert === "string" ? cert : (cert as any).name ?? ""}
                </div>
              ))}
            </>}
          </div>
          <div>
            {allSkills(c).length > 0 && <>
              <CrTitle acc={ACC}>Skills</CrTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {allSkills(c).map((s, i) => (
                  <span key={i} style={{ fontSize: 9.5, background: "#f3f0ff", color: ACC, borderRadius: 4, padding: "2px 7px", fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </>}
            {(c.projects ?? []).length > 0 && <>
              <CrTitle acc={ACC}>Projects</CrTitle>
              {(c.projects ?? []).map((p, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 11 }}>{p.name}</div>
                  {p.technologies?.length > 0 && <div style={{ fontSize: 9.5, color: "#888" }}>{p.technologies.join(", ")}</div>}
                  {p.description && <div style={{ fontSize: 10.5, color: "#555" }}>{p.description}</div>}
                </div>
              ))}
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CrTitle({ children, acc }: { children: React.ReactNode; acc: string }) {
  return <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 800, color: acc, marginBottom: 8, marginTop: 14 }}>{children}</div>;
}
