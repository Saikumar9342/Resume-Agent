import type { ResumeContent } from "@/types/resume";

export function exportATSPlainText(content: ResumeContent, title: string): void {
  const lines: string[] = [];

  const { contact, summary, experience, education, skills, certifications, projects } = content;

  // ── CONTACT ──────────────────────────────────────────────────────────────
  if (contact?.name) lines.push(contact.name.toUpperCase());
  const contactLine = [contact?.email, contact?.phone, contact?.location, contact?.linkedin, contact?.github]
    .filter(Boolean).join(" | ");
  if (contactLine) lines.push(contactLine);
  lines.push("");

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  if (summary?.trim()) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push("-".repeat(40));
    lines.push(summary.trim());
    lines.push("");
  }

  // ── EXPERIENCE ────────────────────────────────────────────────────────────
  if (experience?.length) {
    lines.push("WORK EXPERIENCE");
    lines.push("-".repeat(40));
    for (const e of experience) {
      const dateRange = [e.start, e.end || "Present"].filter(Boolean).join(" - ");
      lines.push(`${e.title} | ${e.company} | ${dateRange}`);
      for (const b of e.bullets ?? []) {
        lines.push(`* ${b}`);
      }
      lines.push("");
    }
  }

  // ── EDUCATION ─────────────────────────────────────────────────────────────
  if (education?.length) {
    lines.push("EDUCATION");
    lines.push("-".repeat(40));
    for (const e of education) {
      const deg = [e.degree, e.field ? `in ${e.field}` : ""].filter(Boolean).join(" ");
      lines.push(`${deg} | ${e.institution} | ${e.year}`);
    }
    lines.push("");
  }

  // ── SKILLS ────────────────────────────────────────────────────────────────
  const allSkills = [...(skills?.technical ?? []), ...(skills?.soft ?? [])];
  if (allSkills.length) {
    lines.push("SKILLS");
    lines.push("-".repeat(40));
    // ATS parsers handle comma lists best
    lines.push(allSkills.join(", "));
    lines.push("");
  }

  // ── PROJECTS ──────────────────────────────────────────────────────────────
  if (projects?.length) {
    lines.push("PROJECTS");
    lines.push("-".repeat(40));
    for (const p of projects) {
      lines.push(p.name);
      if (p.technologies?.length) lines.push(`Technologies: ${p.technologies.join(", ")}`);
      if (p.description) lines.push(p.description);
      if (p.url) lines.push(p.url);
      lines.push("");
    }
  }

  // ── CERTIFICATIONS ────────────────────────────────────────────────────────
  if (certifications?.length) {
    lines.push("CERTIFICATIONS");
    lines.push("-".repeat(40));
    for (const c of certifications) {
      lines.push(typeof c === "string" ? c : (c as { name?: string }).name ?? "");
    }
    lines.push("");
  }

  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (title || "resume").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  a.href = url;
  a.download = `${safe}-ats.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
