import type { ResumeContent } from "@/types/resume";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from "docx";

function hr(): Paragraph {
  return new Paragraph({
    border: { bottom: { color: "999999", size: 6, style: BorderStyle.SINGLE } },
    spacing: { after: 80 },
  });
}

function sectionHeading(label: string, accentHex = "1a56db"): Paragraph {
  return new Paragraph({
    text: label.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 60 },
    border: { bottom: { color: accentHex, size: 8, style: BorderStyle.SINGLE } },
    run: { color: accentHex, size: 20, bold: true, font: "Calibri" },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 40 },
    run: { size: 20, font: "Calibri" },
  });
}

function bodyPara(runs: TextRun[], spacing = 60): Paragraph {
  return new Paragraph({ children: runs, spacing: { after: spacing } });
}

export async function exportDocx(resume: ResumeContent, filename = "resume"): Promise<void> {
  const c = resume;
  const contact = c.contact ?? {} as ResumeContent["contact"];
  const ACCENT = "1a56db";

  const children: (Paragraph | Table)[] = [];

  // ── Name ──
  children.push(new Paragraph({
    children: [new TextRun({ text: contact.name || "Your Name", bold: true, size: 52, font: "Calibri", color: "111111" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }));

  // ── Contact line ──
  const contactParts = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean);
  if (contactParts.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contactParts.join("  ·  "), size: 18, font: "Calibri", color: "555555" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }));
  }

  children.push(hr());

  // ── Summary ──
  if (c.summary) {
    children.push(sectionHeading("Professional Summary", ACCENT));
    children.push(bodyPara([new TextRun({ text: c.summary, size: 20, font: "Calibri" })], 120));
  }

  // ── Experience ──
  if ((c.experience ?? []).length > 0) {
    children.push(sectionHeading("Experience", ACCENT));
    for (const exp of c.experience ?? []) {
      children.push(bodyPara([
        new TextRun({ text: exp.company, bold: true, size: 22, font: "Calibri" }),
        new TextRun({ text: `   ${exp.start}${exp.end ? ` – ${exp.end}` : ""}`, size: 18, color: "777777", font: "Calibri" }),
      ]));
      children.push(bodyPara([
        new TextRun({ text: exp.title, italics: true, size: 20, color: "444444", font: "Calibri" }),
      ], 40));
      for (const b of exp.bullets ?? []) {
        if (b.trim()) children.push(bullet(b));
      }
      children.push(new Paragraph({ spacing: { after: 80 } }));
    }
  }

  // ── Education ──
  if ((c.education ?? []).length > 0) {
    children.push(sectionHeading("Education", ACCENT));
    for (const edu of c.education ?? []) {
      children.push(bodyPara([
        new TextRun({ text: edu.institution, bold: true, size: 20, font: "Calibri" }),
        new TextRun({ text: `   ${edu.year || ""}`, size: 18, color: "777777", font: "Calibri" }),
      ]));
      children.push(bodyPara([
        new TextRun({ text: `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}`, italics: true, size: 18, color: "555555", font: "Calibri" }),
      ], 80));
    }
  }

  // ── Skills ──
  const allSkills = [...(c.skills?.technical ?? []), ...(c.skills?.soft ?? [])];
  if (allSkills.length > 0) {
    children.push(sectionHeading("Skills", ACCENT));
    children.push(bodyPara([new TextRun({ text: allSkills.join("  ·  "), size: 20, font: "Calibri" })], 120));
  }

  // ── Certifications ──
  if ((c.certifications ?? []).length > 0) {
    children.push(sectionHeading("Certifications", ACCENT));
    for (const cert of c.certifications ?? []) {
      const text = typeof cert === "string" ? cert : (cert as any)?.name ?? "";
      if (text) children.push(bullet(text));
    }
  }

  // ── Projects ──
  if ((c.projects ?? []).length > 0) {
    children.push(sectionHeading("Projects", ACCENT));
    for (const p of c.projects ?? []) {
      const techStr = (p.technologies ?? []).length ? `  ·  ${p.technologies.join(", ")}` : "";
      children.push(bodyPara([
        new TextRun({ text: p.name, bold: true, size: 20, font: "Calibri" }),
        new TextRun({ text: techStr, size: 18, color: "888888", font: "Calibri" }),
      ]));
      if (p.description) children.push(bodyPara([new TextRun({ text: p.description, size: 20, font: "Calibri" })], 80));
    }
  }

  // ── Custom sections ──
  for (const [title, lines] of Object.entries(c.custom ?? {})) {
    const filtered = (lines as string[]).filter(Boolean);
    if (!filtered.length) continue;
    children.push(sectionHeading(title, ACCENT));
    for (const line of filtered) children.push(bullet(line));
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
      },
      children,
    }],
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 20, color: "111111" } },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename.replace(/[^a-z0-9-_]/gi, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
