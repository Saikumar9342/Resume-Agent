"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ResumeContent, ResumeStyle } from "@/types/resume";
import { DEFAULT_STYLE } from "@/types/resume";

export type TemplateId = "minimal" | "classic" | "modern" | "executive" | "compact" | "creative";

interface TemplatePickerProps {
  current: TemplateId;
  resume: ResumeContent;
  resumeStyle?: ResumeStyle;
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

export function TemplatePicker({ current, resume, resumeStyle, onSelect, onClose }: TemplatePickerProps) {
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
                    <TemplatePreview id={t.id} resume={resume} resumeStyle={resumeStyle} />
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

function TemplatePreview({ id, resume, resumeStyle }: { id: TemplateId; resume: ResumeContent; resumeStyle?: ResumeStyle }) {
  switch (id) {
    case "minimal":   return <MinimalTemplate resume={resume} resumeStyle={resumeStyle} />;
    case "classic":   return <ClassicTemplate resume={resume} resumeStyle={resumeStyle} />;
    case "modern":    return <ModernTemplate resume={resume} resumeStyle={resumeStyle} />;
    case "executive": return <ExecutiveTemplate resume={resume} resumeStyle={resumeStyle} />;
    case "compact":   return <CompactTemplate resume={resume} resumeStyle={resumeStyle} />;
    case "creative":  return <CreativeTemplate resume={resume} resumeStyle={resumeStyle} />;
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
export function MinimalTemplate({ resume: c, resumeStyle }: { resume: ResumeContent; resumeStyle?: ResumeStyle }) {
  const s = { ...DEFAULT_STYLE, ...resumeStyle };
  const contact = c.contact ?? {};
  return (
    <div style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.bodyColor, padding: `${s.pageMargin}px ${Math.round(s.pageMargin * 1.2)}px`, background: "white", minHeight: 1000 }}>
      <h1 style={{ fontSize: s.fontSize * 2.6, fontWeight: 300, letterSpacing: "-0.5px", margin: "0 0 5px", color: s.headingColor }}>{contact.name || "Your Name"}</h1>
      <div style={{ fontSize: s.fontSize * 0.88, color: "#777", marginBottom: s.sectionSpacing * 1.6, letterSpacing: "0.02em" }}>{contactLine(contact)}</div>

      {c.summary && <MnSection label="Summary" spacing={s.sectionSpacing}><p style={{ margin: 0, color: s.bodyColor, fontSize: s.fontSize * 0.95 }}>{c.summary}</p></MnSection>}

      {(c.experience ?? []).length > 0 && (
        <MnSection label="Experience" spacing={s.sectionSpacing}>
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: s.sectionSpacing * 0.8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, fontSize: s.fontSize, color: s.headingColor }}>{e.company}</span>
                <span style={{ fontSize: s.fontSize * 0.87, color: "#999" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: s.fontSize * 0.92, color: "#666", fontStyle: "italic", marginBottom: 4 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 14, color: s.bodyColor }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: s.fontSize * 0.92, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </MnSection>
      )}

      {(c.projects ?? []).length > 0 && (
        <MnSection label="Projects" spacing={s.sectionSpacing}>
          {(c.projects ?? []).map((p, i) => (
            <div key={i} style={{ marginBottom: s.sectionSpacing * 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: s.fontSize * 0.96 }}>{p.name}</span>
                {p.url && <span style={{ fontSize: s.fontSize * 0.83, color: "#888" }}>{p.url}</span>}
              </div>
              {p.technologies?.length > 0 && <div style={{ fontSize: s.fontSize * 0.83, color: "#888", marginBottom: 2 }}>{p.technologies.join(", ")}</div>}
              {p.description && <div style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor }}>{p.description}</div>}
            </div>
          ))}
        </MnSection>
      )}

      {(c.education ?? []).length > 0 && (
        <MnSection label="Education" spacing={s.sectionSpacing}>
          {(c.education ?? []).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: s.fontSize, color: s.headingColor }}>{e.institution}</div>
                <div style={{ fontSize: s.fontSize * 0.92, color: "#666", fontStyle: "italic" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
              </div>
              <span style={{ fontSize: s.fontSize * 0.87, color: "#999" }}>{e.year}</span>
            </div>
          ))}
        </MnSection>
      )}

      {allSkills(c).length > 0 && (
        <MnSection label="Skills" spacing={s.sectionSpacing}>
          <div style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor, lineHeight: 1.8 }}>{allSkills(c).join("  ·  ")}</div>
        </MnSection>
      )}

      {(c.certifications ?? []).length > 0 && (
        <MnSection label="Certifications" spacing={s.sectionSpacing}>
          {(c.certifications ?? []).map((cert, i) => (
            <div key={i} style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor, marginBottom: 3 }}>· {typeof cert === "string" ? cert : (cert as any).name ?? JSON.stringify(cert)}</div>
          ))}
        </MnSection>
      )}
    </div>
  );
}

function MnSection({ label, children, spacing }: { label: string; children: React.ReactNode; spacing: number }) {
  return (
    <div style={{ marginBottom: spacing }}>
      <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.2em", color: "#bbb", marginBottom: spacing * 0.5, borderBottom: "1px solid #f0f0f0", paddingBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

// Keep for backward compat (TemplatePicker thumbnails)
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <MnSection label={label} spacing={18}>{children}</MnSection>;
}

/* ══════════════════════════════════════════════
   2. CLASSIC — serif, ATS-safe, traditional
══════════════════════════════════════════════ */
export function ClassicTemplate({ resume: c, resumeStyle }: { resume: ResumeContent; resumeStyle?: ResumeStyle }) {
  const s = { ...DEFAULT_STYLE, ...resumeStyle };
  const contact = c.contact ?? {};
  return (
    <div style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.headingColor, padding: `${s.pageMargin}px ${Math.round(s.pageMargin * 1.15)}px`, background: "white", minHeight: 1000 }}>
      <div style={{ textAlign: "center", marginBottom: s.sectionSpacing * 0.8, borderBottom: `2px solid ${s.headingColor}`, paddingBottom: 12 }}>
        <h1 style={{ fontSize: s.fontSize * 2.1, fontWeight: 700, margin: "0 0 5px", color: s.headingColor }}>{contact.name || "Your Name"}</h1>
        <div style={{ fontSize: s.fontSize * 0.87, color: "#444" }}>{contactLine(contact, "  |  ")}</div>
      </div>

      {c.summary && <><ClassicTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Professional Summary</ClassicTitle><p style={{ fontSize: s.fontSize * 0.96, marginBottom: s.sectionSpacing * 0.65, margin: `0 0 ${s.sectionSpacing * 0.65}px`, color: s.bodyColor, lineHeight: s.lineHeight }}>{c.summary}</p></>}

      {(c.experience ?? []).length > 0 && (
        <><ClassicTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Professional Experience</ClassicTitle>
        {(c.experience ?? []).map((e, i) => (
          <div key={i} style={{ marginBottom: s.sectionSpacing * 0.7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ fontSize: s.fontSize, color: s.headingColor }}>{e.company}</strong>
              <span style={{ fontSize: s.fontSize * 0.87, color: "#555" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
            </div>
            <div style={{ fontSize: s.fontSize * 0.96, fontStyle: "italic", color: "#444", marginBottom: 3 }}>{e.title}</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: s.fontSize * 0.92, marginBottom: 2, color: s.bodyColor }}>{b}</li>)}
            </ul>
          </div>
        ))}</>
      )}

      {(c.projects ?? []).length > 0 && (
        <><ClassicTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Projects</ClassicTitle>
        {(c.projects ?? []).map((p, i) => (
          <div key={i} style={{ marginBottom: s.sectionSpacing * 0.45 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ fontSize: s.fontSize * 0.96 }}>{p.name}</strong>
              {p.url && <span style={{ fontSize: s.fontSize * 0.83, color: "#666" }}>{p.url}</span>}
            </div>
            {p.technologies?.length > 0 && <div style={{ fontSize: s.fontSize * 0.87, color: "#666", fontStyle: "italic" }}>{p.technologies.join(", ")}</div>}
            {p.description && <div style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor }}>{p.description}</div>}
          </div>
        ))}</>
      )}

      {(c.education ?? []).length > 0 && (
        <><ClassicTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Education</ClassicTitle>
        {(c.education ?? []).map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <strong style={{ color: s.headingColor }}>{e.institution}</strong>
              <div style={{ fontSize: s.fontSize * 0.92, fontStyle: "italic", color: "#444" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
            </div>
            <span style={{ fontSize: s.fontSize * 0.87, color: "#555" }}>{e.year}</span>
          </div>
        ))}</>
      )}

      {allSkills(c).length > 0 && (
        <><ClassicTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Technical Skills</ClassicTitle>
        <p style={{ fontSize: s.fontSize * 0.92, lineHeight: 1.7, margin: 0, color: s.bodyColor }}>{allSkills(c).join(" · ")}</p></>
      )}

      {(c.certifications ?? []).length > 0 && (
        <><ClassicTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Certifications</ClassicTitle>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {(c.certifications ?? []).map((cert, i) => (
            <li key={i} style={{ fontSize: s.fontSize * 0.92, marginBottom: 2, color: s.bodyColor }}>{typeof cert === "string" ? cert : (cert as any).name ?? ""}</li>
          ))}
        </ul></>
      )}
    </div>
  );
}

function ClassicTitle({ children, acc, fs, sp }: { children: React.ReactNode; acc: string; fs: number; sp: number }) {
  return <div style={{ fontSize: fs * 0.92, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, borderBottom: `1px solid ${acc}`, paddingBottom: 3, margin: `${sp * 0.78}px 0 ${sp * 0.4}px`, color: acc }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   3. MODERN — two-column, accent sidebar
══════════════════════════════════════════════ */
export function ModernTemplate({ resume: c, resumeStyle }: { resume: ResumeContent; resumeStyle?: ResumeStyle }) {
  const s = { ...DEFAULT_STYLE, ...resumeStyle };
  const contact = c.contact ?? {};
  const ACC = s.accentColor;
  return (
    <div style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.bodyColor, background: "white", minHeight: 1000, display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 195, background: ACC, color: "white", padding: `${s.pageMargin * 0.75}px 18px`, flexShrink: 0, display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ fontSize: s.fontSize * 1.6, fontWeight: 700, lineHeight: 1.2, marginBottom: 5, wordBreak: "break-word" }}>{contact.name || "Your Name"}</div>
        <div style={{ fontSize: s.fontSize * 0.77, opacity: 0.8, lineHeight: 1.8, marginBottom: s.sectionSpacing }}>
          {[contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
        </div>

        {allSkills(c).length > 0 && <>
          <SbTitle>Skills</SbTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: s.sectionSpacing }}>
            {allSkills(c).map((sk, i) => <span key={i} style={{ fontSize: s.fontSize * 0.77, background: "rgba(255,255,255,0.18)", borderRadius: 3, padding: "2px 5px" }}>{sk}</span>)}
          </div>
        </>}

        {(c.education ?? []).length > 0 && <>
          <SbTitle>Education</SbTitle>
          {(c.education ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: s.sectionSpacing * 0.5, fontSize: s.fontSize * 0.87 }}>
              <div style={{ fontWeight: 600 }}>{e.institution}</div>
              <div style={{ opacity: 0.8 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
              <div style={{ opacity: 0.65 }}>{e.year}</div>
            </div>
          ))}
        </>}

        {(c.certifications ?? []).length > 0 && <>
          <SbTitle>Certifications</SbTitle>
          {(c.certifications ?? []).map((cert, i) => (
            <div key={i} style={{ fontSize: s.fontSize * 0.82, opacity: 0.85, marginBottom: 4 }}>{typeof cert === "string" ? cert : (cert as any).name ?? ""}</div>
          ))}
        </>}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: `${s.pageMargin * 0.75}px ${Math.round(s.pageMargin * 0.65)}px` }}>
        {c.summary && <><MnTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Summary</MnTitle><p style={{ fontSize: s.fontSize * 0.96, color: "#444", margin: `0 0 ${s.sectionSpacing}px`, lineHeight: s.lineHeight }}>{c.summary}</p></>}

        {(c.experience ?? []).length > 0 && <>
          <MnTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Experience</MnTitle>
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: s.sectionSpacing * 0.75 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: s.fontSize, color: s.headingColor }}>{e.company}</span>
                <span style={{ fontSize: s.fontSize * 0.87, color: "#888" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: s.fontSize * 0.92, color: ACC, fontWeight: 600, marginBottom: 3 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 13 }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>}

        {(c.projects ?? []).length > 0 && <>
          <MnTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Projects</MnTitle>
          {(c.projects ?? []).map((p, i) => (
            <div key={i} style={{ marginBottom: s.sectionSpacing * 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: s.fontSize * 0.96 }}>{p.name}</span>
                {p.url && <span style={{ fontSize: s.fontSize * 0.82, color: "#888" }}>{p.url}</span>}
              </div>
              {p.technologies?.length > 0 && <div style={{ fontSize: s.fontSize * 0.87, color: "#888" }}>{p.technologies.join(", ")}</div>}
              {p.description && <div style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor, marginTop: 2 }}>{p.description}</div>}
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
function MnTitle({ children, acc, fs, sp }: { children: React.ReactNode; acc: string; fs: number; sp: number }) {
  return <div style={{ fontSize: fs * 0.87, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, color: acc, borderBottom: `2px solid ${acc}`, paddingBottom: 3, margin: `0 0 ${sp * 0.5}px` }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   4. EXECUTIVE — premium, understated, leadership
══════════════════════════════════════════════ */
export function ExecutiveTemplate({ resume: c, resumeStyle }: { resume: ResumeContent; resumeStyle?: ResumeStyle }) {
  const s = { ...DEFAULT_STYLE, ...resumeStyle };
  const contact = c.contact ?? {};
  const GOLD = s.accentColor;
  return (
    <div style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.bodyColor, padding: `${s.pageMargin}px ${Math.round(s.pageMargin * 1.25)}px`, background: "white", minHeight: 1000 }}>
      <div style={{ marginBottom: s.sectionSpacing }}>
        <h1 style={{ fontSize: s.fontSize * 2.4, fontWeight: 400, letterSpacing: "0.04em", margin: "0 0 4px", color: s.headingColor, textTransform: "uppercase" }}>{contact.name || "Your Name"}</h1>
        <div style={{ width: 48, height: 2, background: GOLD, margin: "8px 0 12px" }} />
        <div style={{ fontSize: s.fontSize * 0.87, color: "#666", letterSpacing: "0.04em" }}>{contactLine(contact, "   ·   ")}</div>
      </div>

      {c.summary && (
        <div style={{ marginBottom: s.sectionSpacing, paddingBottom: s.sectionSpacing * 0.85, borderBottom: "1px solid #e8e0d0" }}>
          <p style={{ fontSize: s.fontSize, color: "#333", fontStyle: "italic", margin: 0, lineHeight: s.lineHeight * 1.08 }}>{c.summary}</p>
        </div>
      )}

      {(c.experience ?? []).length > 0 && (
        <div style={{ marginBottom: s.sectionSpacing }}>
          <ExecTitle acc={GOLD} fs={s.fontSize} sp={s.sectionSpacing}>Professional Experience</ExecTitle>
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: s.sectionSpacing }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: s.fontSize, textTransform: "uppercase", letterSpacing: "0.04em", color: s.headingColor }}>{e.company}</span>
                <span style={{ fontSize: s.fontSize * 0.87, color: "#888", fontStyle: "italic" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: s.fontSize * 0.96, color: GOLD, fontStyle: "italic", marginBottom: 5 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 18, listStyleType: "disc" }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: s.fontSize * 0.96, marginBottom: 3, color: s.bodyColor }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          {(c.education ?? []).length > 0 && <>
            <ExecTitle acc={GOLD} fs={s.fontSize} sp={s.sectionSpacing}>Education</ExecTitle>
            {(c.education ?? []).map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: s.fontSize, color: s.headingColor }}>{e.institution}</div>
                <div style={{ fontSize: s.fontSize * 0.96, fontStyle: "italic", color: "#555" }}>{e.degree}{e.field ? `, ${e.field}` : ""}</div>
                <div style={{ fontSize: s.fontSize * 0.87, color: "#888" }}>{e.year}</div>
              </div>
            ))}
          </>}
          {(c.certifications ?? []).length > 0 && <>
            <ExecTitle acc={GOLD} fs={s.fontSize} sp={s.sectionSpacing}>Certifications</ExecTitle>
            {(c.certifications ?? []).map((cert, i) => (
              <div key={i} style={{ fontSize: s.fontSize * 0.96, marginBottom: 3, color: s.bodyColor }}>· {typeof cert === "string" ? cert : (cert as any).name ?? ""}</div>
            ))}
          </>}
        </div>
        <div>
          {allSkills(c).length > 0 && <>
            <ExecTitle acc={GOLD} fs={s.fontSize} sp={s.sectionSpacing}>Core Competencies</ExecTitle>
            <div style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor, lineHeight: 2 }}>{allSkills(c).join("  ·  ")}</div>
          </>}
          {(c.projects ?? []).length > 0 && <>
            <ExecTitle acc={GOLD} fs={s.fontSize} sp={s.sectionSpacing}>Key Projects</ExecTitle>
            {(c.projects ?? []).map((p, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ fontWeight: 600, fontSize: s.fontSize * 0.96, color: s.headingColor }}>{p.name}</div>
                {p.description && <div style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor }}>{p.description}</div>}
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

function ExecTitle({ children, acc, fs, sp }: { children: React.ReactNode; acc: string; fs: number; sp: number }) {
  return <div style={{ fontSize: fs * 0.83, textTransform: "uppercase", letterSpacing: "0.18em", color: acc, fontWeight: 700, borderBottom: "1px solid #e8e0d0", paddingBottom: 4, margin: `${sp * 0.75}px 0 ${sp * 0.45}px` }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   5. COMPACT — dense, fits everything on 1 page
══════════════════════════════════════════════ */
export function CompactTemplate({ resume: c, resumeStyle }: { resume: ResumeContent; resumeStyle?: ResumeStyle }) {
  const s = { ...DEFAULT_STYLE, ...resumeStyle };
  const contact = c.contact ?? {};
  return (
    <div style={{ fontFamily: s.fontFamily, fontSize: s.fontSize * 0.92, lineHeight: s.lineHeight * 0.94, color: s.bodyColor, padding: `${s.pageMargin * 0.6}px ${Math.round(s.pageMargin * 0.75)}px`, background: "white", minHeight: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${s.headingColor}` }}>
        <div>
          <h1 style={{ fontSize: s.fontSize * 1.75, fontWeight: 700, margin: 0, letterSpacing: "-0.3px", color: s.headingColor }}>{contact.name || "Your Name"}</h1>
          {c.experience?.[0]?.title && <div style={{ fontSize: s.fontSize * 0.87, color: "#555", marginTop: 2 }}>{c.experience[0].title}</div>}
        </div>
        <div style={{ fontSize: s.fontSize * 0.82, color: "#555", textAlign: "right", lineHeight: 1.8 }}>
          {[contact.email, contact.phone, contact.location].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
          {[contact.linkedin, contact.github].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
        </div>
      </div>

      {c.summary && <><CpTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Summary</CpTitle><p style={{ fontSize: s.fontSize * 0.87, margin: `0 0 ${s.sectionSpacing * 0.45}px`, color: s.bodyColor, lineHeight: s.lineHeight }}>{c.summary}</p></>}

      {(c.experience ?? []).length > 0 && <>
        <CpTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Experience</CpTitle>
        {(c.experience ?? []).map((e, i) => (
          <div key={i} style={{ marginBottom: s.sectionSpacing * 0.55 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: s.fontSize * 0.92, color: s.headingColor }}>{e.company} <span style={{ fontWeight: 400, fontStyle: "italic", color: "#555" }}>— {e.title}</span></span>
              <span style={{ fontSize: s.fontSize * 0.83, color: "#888" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
            </div>
            <ul style={{ margin: "3px 0 0", paddingLeft: 14 }}>
              {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: s.fontSize * 0.87, marginBottom: 1, color: s.bodyColor }}>{b}</li>)}
            </ul>
          </div>
        ))}
      </>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          {(c.education ?? []).length > 0 && <>
            <CpTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Education</CpTitle>
            {(c.education ?? []).map((e, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <div style={{ fontWeight: 600, fontSize: s.fontSize * 0.92, color: s.headingColor }}>{e.institution}</div>
                <div style={{ fontSize: s.fontSize * 0.87, color: "#555" }}>{e.degree}{e.field ? ` in ${e.field}` : ""} {e.year ? `· ${e.year}` : ""}</div>
              </div>
            ))}
          </>}
          {(c.certifications ?? []).length > 0 && <>
            <CpTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Certifications</CpTitle>
            {(c.certifications ?? []).map((cert, i) => (
              <div key={i} style={{ fontSize: s.fontSize * 0.87, color: s.bodyColor, marginBottom: 2 }}>· {typeof cert === "string" ? cert : (cert as any).name ?? ""}</div>
            ))}
          </>}
        </div>
        <div>
          {allSkills(c).length > 0 && <>
            <CpTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Skills</CpTitle>
            <div style={{ fontSize: s.fontSize * 0.87, color: s.bodyColor, lineHeight: 1.7 }}>{allSkills(c).join(" · ")}</div>
          </>}
          {(c.projects ?? []).length > 0 && <>
            <CpTitle acc={s.accentColor} fs={s.fontSize} sp={s.sectionSpacing}>Projects</CpTitle>
            {(c.projects ?? []).map((p, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <span style={{ fontWeight: 600, fontSize: s.fontSize * 0.92, color: s.headingColor }}>{p.name}</span>
                {p.technologies?.length > 0 && <span style={{ fontSize: s.fontSize * 0.83, color: "#888" }}> · {p.technologies.join(", ")}</span>}
                {p.description && <div style={{ fontSize: s.fontSize * 0.87, color: s.bodyColor }}>{p.description}</div>}
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

function CpTitle({ children, acc, fs, sp }: { children: React.ReactNode; acc: string; fs: number; sp: number }) {
  return <div style={{ fontSize: fs * 0.78, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, color: acc, borderBottom: "1px solid #ddd", paddingBottom: 2, margin: `${sp * 0.45}px 0 ${sp * 0.28}px` }}>{children}</div>;
}

/* ══════════════════════════════════════════════
   6. CREATIVE — bold header band, colorful
══════════════════════════════════════════════ */
export function CreativeTemplate({ resume: c, resumeStyle }: { resume: ResumeContent; resumeStyle?: ResumeStyle }) {
  const s = { ...DEFAULT_STYLE, ...resumeStyle };
  const contact = c.contact ?? {};
  const ACC = s.accentColor;
  // derive a lighter variant for decorative elements
  const ACC2 = ACC + "bb";
  return (
    <div style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, lineHeight: s.lineHeight, color: s.bodyColor, background: "white", minHeight: 1000 }}>
      <div style={{ background: `linear-gradient(135deg, ${ACC} 0%, ${ACC}cc 100%)`, color: "white", padding: `${s.pageMargin * 0.75}px ${Math.round(s.pageMargin * 0.9)}px ${s.pageMargin * 0.6}px` }}>
        <h1 style={{ fontSize: s.fontSize * 2.5, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" }}>{contact.name || "Your Name"}</h1>
        {c.experience?.[0]?.title && <div style={{ fontSize: s.fontSize * 1.05, opacity: 0.85, marginBottom: 10, fontWeight: 300 }}>{c.experience[0].title}</div>}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: s.fontSize * 0.83, opacity: 0.8, marginTop: 8 }}>
          {[contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean).map((v, i) => (
            <span key={i}>· {v}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: `${s.pageMargin * 0.6}px ${Math.round(s.pageMargin * 0.9)}px` }}>
        {c.summary && <><CrTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>About Me</CrTitle><p style={{ fontSize: s.fontSize * 0.96, color: "#444", margin: `0 0 ${s.sectionSpacing}px`, lineHeight: s.lineHeight }}>{c.summary}</p></>}

        {(c.experience ?? []).length > 0 && <>
          <CrTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Experience</CrTitle>
          {(c.experience ?? []).map((e, i) => (
            <div key={i} style={{ marginBottom: s.sectionSpacing * 0.85, paddingLeft: 12, borderLeft: `3px solid ${ACC2}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: s.fontSize, color: s.headingColor }}>{e.company}</span>
                <span style={{ fontSize: s.fontSize * 0.83, color: "#999", fontStyle: "italic" }}>{e.start}{e.end ? ` – ${e.end}` : ""}</span>
              </div>
              <div style={{ fontSize: s.fontSize * 0.92, color: ACC, fontWeight: 600, marginBottom: 4 }}>{e.title}</div>
              <ul style={{ margin: 0, paddingLeft: 14 }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 4 }}>
          <div>
            {(c.education ?? []).length > 0 && <>
              <CrTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Education</CrTitle>
              {(c.education ?? []).map((e, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: s.fontSize, color: s.headingColor }}>{e.institution}</div>
                  <div style={{ fontSize: s.fontSize * 0.92, color: "#666" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                  <div style={{ fontSize: s.fontSize * 0.87, color: "#aaa" }}>{e.year}</div>
                </div>
              ))}
            </>}
            {(c.certifications ?? []).length > 0 && <>
              <CrTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Certifications</CrTitle>
              {(c.certifications ?? []).map((cert, i) => (
                <div key={i} style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor, marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: ACC2, flexShrink: 0, display: "inline-block" }} />
                  {typeof cert === "string" ? cert : (cert as any).name ?? ""}
                </div>
              ))}
            </>}
          </div>
          <div>
            {allSkills(c).length > 0 && <>
              <CrTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Skills</CrTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {allSkills(c).map((sk, i) => (
                  <span key={i} style={{ fontSize: s.fontSize * 0.83, background: `${ACC}18`, color: ACC, borderRadius: 4, padding: "2px 7px", fontWeight: 500 }}>{sk}</span>
                ))}
              </div>
            </>}
            {(c.projects ?? []).length > 0 && <>
              <CrTitle acc={ACC} fs={s.fontSize} sp={s.sectionSpacing}>Projects</CrTitle>
              {(c.projects ?? []).map((p, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: s.fontSize * 0.96, color: s.headingColor }}>{p.name}</div>
                  {p.technologies?.length > 0 && <div style={{ fontSize: s.fontSize * 0.83, color: "#888" }}>{p.technologies.join(", ")}</div>}
                  {p.description && <div style={{ fontSize: s.fontSize * 0.92, color: s.bodyColor }}>{p.description}</div>}
                </div>
              ))}
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CrTitle({ children, acc, fs, sp }: { children: React.ReactNode; acc: string; fs: number; sp: number }) {
  return <div style={{ fontSize: fs * 0.87, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 800, color: acc, marginBottom: sp * 0.45, marginTop: sp * 0.75 }}>{children}</div>;
}
