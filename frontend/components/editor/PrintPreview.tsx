"use client";

import { useEffect } from "react";
import type { ResumeContent } from "@/types/resume";

interface PrintPreviewProps {
  resume: ResumeContent;
  title: string;
  onClose: () => void;
}

export function PrintPreview({ resume, title, onClose }: PrintPreviewProps) {
  useEffect(() => {
    const onAfterPrint = () => onClose();
    window.addEventListener("afterprint", onAfterPrint);
    // small delay so the DOM is painted before dialog opens
    const t = setTimeout(() => window.print(), 120);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [onClose]);

  const c = resume;
  const contact = c.contact ?? {};

  return (
    <div id="resume-print-root" style={{ display: "none" }}>
      <style>{`
        @media print {
          @page { margin: 18mm 16mm; size: A4; }
          body > *:not(#resume-print-root) { display: none !important; }
          #resume-print-root { display: block !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        #resume-print-root {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #111;
          max-width: 100%;
        }
        .rp-name { font-size: 22pt; font-weight: bold; letter-spacing: -0.5px; margin: 0 0 4px; }
        .rp-contact { font-size: 9pt; color: #555; margin-bottom: 14px; font-family: Arial, sans-serif; }
        .rp-contact span + span::before { content: "  ·  "; color: #aaa; }
        .rp-h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.12em; color: #888; border-bottom: 0.5pt solid #ccc; padding-bottom: 3px; margin: 14px 0 8px; font-family: Arial, sans-serif; }
        .rp-entry { margin-bottom: 10px; }
        .rp-row { display: flex; justify-content: space-between; }
        .rp-company { font-weight: bold; font-size: 11pt; }
        .rp-date { font-size: 9pt; color: #666; font-family: Arial, sans-serif; }
        .rp-title { font-size: 10pt; color: #444; font-style: italic; margin: 1px 0 4px; }
        .rp-bullets { margin: 0; padding-left: 14px; }
        .rp-bullets li { margin-bottom: 2px; font-size: 10pt; }
        .rp-skills { font-size: 10pt; color: #222; }
        .rp-cert { font-size: 10pt; }
        .rp-proj-name { font-weight: bold; font-size: 10pt; }
        .rp-proj-tech { font-size: 9pt; color: #666; font-family: Arial, sans-serif; }
        .rp-proj-desc { font-size: 10pt; margin-top: 2px; }
      `}</style>

      <div className="rp-name">{contact.name || title}</div>
      <div className="rp-contact">
        {[contact.email, contact.phone, contact.location, contact.linkedin, contact.github]
          .filter(Boolean)
          .map((v, i) => <span key={i}>{v}</span>)}
      </div>

      {c.summary && (
        <>
          <div className="rp-h2">Summary</div>
          <p style={{ fontSize: "10pt", marginBottom: 8 }}>{c.summary}</p>
        </>
      )}

      {c.experience && c.experience.length > 0 && (
        <>
          <div className="rp-h2">Experience</div>
          {c.experience.map((exp, i) => (
            <div key={i} className="rp-entry">
              <div className="rp-row">
                <span className="rp-company">{exp.company}</span>
                <span className="rp-date">{exp.start} – {exp.end}</span>
              </div>
              <div className="rp-title">{exp.title}</div>
              <ul className="rp-bullets">
                {exp.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>
      )}

      {c.education && c.education.length > 0 && (
        <>
          <div className="rp-h2">Education</div>
          {c.education.map((edu, i) => (
            <div key={i} className="rp-entry">
              <div className="rp-row">
                <span className="rp-company">{edu.institution}</span>
                <span className="rp-date">{edu.year}</span>
              </div>
              <div className="rp-title">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</div>
            </div>
          ))}
        </>
      )}

      {c.skills?.technical && c.skills.technical.length > 0 && (
        <>
          <div className="rp-h2">Skills</div>
          <div className="rp-skills">{c.skills.technical.join("  ·  ")}</div>
        </>
      )}

      {c.certifications && c.certifications.length > 0 && (
        <>
          <div className="rp-h2">Certifications</div>
          {c.certifications.filter(Boolean).map((cert, i) => (
            <div key={i} className="rp-cert">✓ {cert}</div>
          ))}
        </>
      )}

      {c.projects && c.projects.length > 0 && (
        <>
          <div className="rp-h2">Projects</div>
          {c.projects.map((p, i) => (
            <div key={i} className="rp-entry">
              <span className="rp-proj-name">{p.name}</span>
              {p.technologies?.length > 0 && (
                <span className="rp-proj-tech">  ·  {p.technologies.join(", ")}</span>
              )}
              {p.description && <div className="rp-proj-desc">{p.description}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
