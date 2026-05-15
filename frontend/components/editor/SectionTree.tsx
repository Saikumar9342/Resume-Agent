"use client";

import { Icon } from "@/components/ui/Icon";
import type { ResumeContent } from "@/types/resume";

type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "projects";

interface SectionTreeProps {
  resume: ResumeContent | null;
  active: SectionId;
  onSelect: (id: SectionId) => void;
  heatmap: boolean;
}

interface SectionItem {
  id: SectionId;
  label: string;
  icon: string;
  heat?: "red" | "amber" | "green";
  dim?: boolean;
}

const SECTION_META: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "contact",    label: "contact.tsx",   icon: "user" },
  { id: "summary",    label: "summary.md",    icon: "summary" },
  { id: "experience", label: "experience/",   icon: "briefcase" },
  { id: "education",  label: "education.tsx", icon: "cap" },
  { id: "skills",     label: "skills.json",   icon: "wrench" },
  { id: "projects",   label: "projects/",     icon: "code" },
];

function sectionHeat(id: SectionId, resume: ResumeContent | null): "red" | "amber" | "green" | null {
  if (!resume) return null;
  switch (id) {
    case "contact": {
      const c = resume.contact;
      const filled = [c?.name, c?.email, c?.phone, c?.location].filter(Boolean).length;
      return filled >= 4 ? "green" : filled >= 2 ? "amber" : "red";
    }
    case "summary":
      return !resume.summary ? "red" : resume.summary.split(/\s+/).length < 30 ? "amber" : "green";
    case "experience": {
      const exps = resume.experience ?? [];
      if (!exps.length) return "red";
      const hasMetrics = exps.some(e => e.bullets?.some(b => /\d+%|\d+ (team|people|engineers|\$|k\b)/i.test(b)));
      return hasMetrics ? "green" : "amber";
    }
    case "education":
      return (resume.education ?? []).length ? "green" : "amber";
    case "skills": {
      const skills = resume.skills?.technical ?? [];
      return skills.length >= 8 ? "green" : skills.length >= 3 ? "amber" : "red";
    }
    case "projects":
      return (resume.projects ?? []).length ? "green" : null;
    default:
      return null;
  }
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-2)", padding: "2px 0" }}>
      <span>{label}</span><span style={{ color: "var(--fg-3)" }}>{v}</span>
    </div>
  );
}

export function SectionTree({ resume, active, onSelect, heatmap }: SectionTreeProps) {
  return (
    <aside style={{
      background: "var(--bg-1)",
      borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column",
      minHeight: 0, overflow: "hidden",
    }}>
      {/* tree header */}
      <div style={{
        height: 34, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px",
        borderBottom: "1px solid var(--line)",
        color: "var(--fg-3)",
      }}>
        <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>resume</span>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="btn btn-ghost" style={{ width: 22, height: 22, padding: 0, justifyContent: "center" }}>
            <Icon name="settings" size={12} />
          </button>
        </div>
      </div>

      <div style={{ padding: "8px 6px", overflow: "auto", flex: 1 }}>
        {SECTION_META.map((s) => {
          const isActive = active === s.id;
          const heat = heatmap ? sectionHeat(s.id, resume) : null;
          const heatColor = heat === "red" ? "var(--red)" : heat === "amber" ? "var(--amber)" : heat === "green" ? "var(--green)" : null;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="mono"
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 8px",
                fontSize: 12,
                borderRadius: 5,
                background: isActive ? "var(--bg-3)" : "transparent",
                color: isActive ? "var(--fg-0)" : "var(--fg-1)",
                cursor: "pointer",
                textAlign: "left",
                border: 0,
                position: "relative",
              }}
            >
              {isActive && <span style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 2, background: "var(--accent)", borderRadius: 1 }} />}
              <Icon name={s.icon} size={13} />
              <span style={{ flex: 1 }}>{s.label}</span>
              {heatColor && <span style={{ width: 6, height: 6, borderRadius: 99, background: heatColor }} />}
            </button>
          );
        })}

        {/* sub items under experience */}
        {resume?.experience && (
          <div style={{ marginLeft: 18, marginTop: 4, marginBottom: 8, borderLeft: "1px solid var(--line-soft)", paddingLeft: 8 }}>
            {resume.experience.map((exp, i) => (
              <div key={i} className="mono" style={{
                padding: "3px 8px", fontSize: 11.5,
                color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 6,
              }}>
                <Icon name="doc" size={11} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(exp.company || "company").toLowerCase()}.md
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer outline */}
      <div style={{ borderTop: "1px solid var(--line)", padding: "10px 12px" }}>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>outline</div>
        <Mini label="contact" v={resume?.contact?.name ? "header" : "—"} />
        <Mini label="summary" v={resume?.summary ? `${resume.summary.split(/\s+/).filter(Boolean).length} words` : "—"} />
        <Mini label="experience" v={resume?.experience?.length ? `${resume.experience.length} roles` : "—"} />
        <Mini label="education" v={resume?.education?.length ? `${resume.education.length} deg.` : "—"} />
        <Mini label="skills" v={resume?.skills?.technical?.length ? `${resume.skills.technical.length} items` : "—"} />
        <Mini label="projects" v={resume?.projects?.length ? `${resume.projects.length} listed` : "—"} />
      </div>
    </aside>
  );
}
