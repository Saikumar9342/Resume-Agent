"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ResumeContent } from "@/types/resume";

interface ShareData {
  title: string;
  content: ResumeContent;
}

export default function SharedResumePage() {
  const params = useParams();
  const token = params?.token as string;
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/r/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setData(d))
      .catch(() => setError(true));
  }, [token]);

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#555" }}>
      Resume not found or link has expired.
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#888" }}>
      Loading…
    </div>
  );

  const c = data.content;
  const contact = c.contact ?? {};
  const name = contact.name ?? data.title ?? "Resume";

  const esc = (s: string) => String(s ?? "");

  return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 820, margin: "40px auto", padding: "0 24px", color: "#111", lineHeight: 1.55, fontSize: 14 }}>
      <h1 style={{ fontSize: 26, margin: "0 0 4px", letterSpacing: "-0.5px" }}>{esc(name)}</h1>
      <div style={{ color: "#555", fontSize: 12.5, marginBottom: 28 }}>
        {[contact.email, contact.phone, contact.location, contact.linkedin, contact.github]
          .filter(Boolean).join(" · ")}
      </div>

      {c.summary && (
        <section>
          <SectionTitle>Summary</SectionTitle>
          <p style={{ marginBottom: 0 }}>{esc(c.summary)}</p>
        </section>
      )}

      {c.experience && c.experience.length > 0 && (
        <section>
          <SectionTitle>Experience</SectionTitle>
          {c.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{esc(e.company ?? "")}</strong>
                <span style={{ color: "#666", fontSize: 12.5 }}>{esc(e.start ?? "")} – {esc(e.end ?? "")}</span>
              </div>
              <div style={{ color: "#444", fontSize: 13, margin: "2px 0 6px", fontStyle: "italic" }}>{esc(e.title ?? "")}</div>
              <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
                {(e.bullets ?? []).map((b, j) => <li key={j} style={{ marginBottom: 3 }}>{esc(b)}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {c.education && c.education.length > 0 && (
        <section>
          <SectionTitle>Education</SectionTitle>
          {c.education.map((e, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{esc(e.institution ?? "")}</strong>
                <span style={{ color: "#666", fontSize: 12.5 }}>{esc(e.year ?? "")}</span>
              </div>
              <div style={{ color: "#444", fontSize: 13, margin: "2px 0", fontStyle: "italic" }}>
                {esc(e.degree ?? "")} in {esc(e.field ?? "")}
              </div>
            </div>
          ))}
        </section>
      )}

      {c.skills?.technical && c.skills.technical.length > 0 && (
        <section>
          <SectionTitle>Skills</SectionTitle>
          <p style={{ marginBottom: 0 }}>{c.skills.technical.join(", ")}</p>
        </section>
      )}

      {c.projects && c.projects.length > 0 && (
        <section>
          <SectionTitle>Projects</SectionTitle>
          {c.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <strong>{esc(p.name ?? "")}</strong>
              {p.technologies && p.technologies.length > 0 && (
                <em style={{ marginLeft: 8, color: "#555", fontSize: 12.5 }}>{p.technologies.join(", ")}</em>
              )}
              <p style={{ marginTop: 4, marginBottom: 0 }}>{esc(p.description ?? "")}</p>
            </div>
          ))}
        </section>
      )}

      <footer style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #ddd", fontSize: 11.5, color: "#aaa", textAlign: "center" }}>
        Shared via resume-agent
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em",
      color: "#888", borderBottom: "1px solid #ddd", paddingBottom: 4,
      margin: "28px 0 14px",
    }}>{children}</h2>
  );
}
