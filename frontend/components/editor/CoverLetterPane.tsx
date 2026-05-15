"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";
import type { ResumeContent } from "@/types/resume";

interface CoverLetterPaneProps {
  resumeId: string | null;
  resume: ResumeContent | null;
  jd: string;
}

export function CoverLetterPane({ resumeId, resume, jd }: CoverLetterPaneProps) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!resumeId) return;
    setLoading(true); setError(null); setLetter("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/resumes/${resumeId}/cover-letter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${JSON.parse(localStorage.getItem("resume-agent-auth") ?? "{}").state?.token ?? ""}`,
          },
          body: JSON.stringify({ job_description: jd, company: company || "the company", role: role || "this role" }),
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setLetter(data.cover_letter ?? "");
    } catch (e) {
      setError("Failed to generate. Make sure a resume and JD are loaded.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cover-letter-${company || "resume"}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!resumeId) {
    return (
      <EmptyState msg="Create or open a resume first to generate a cover letter." />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Config */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          cover letter
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Company name"
            className="mono"
            style={{
              background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 5,
              padding: "5px 9px", fontSize: 12, color: "var(--fg-0)", width: "100%",
            }}
          />
          <input
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="Role / job title"
            className="mono"
            style={{
              background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 5,
              padding: "5px 9px", fontSize: 12, color: "var(--fg-0)", width: "100%",
            }}
          />
          {!jd && (
            <div className="mono" style={{ fontSize: 10.5, color: "var(--amber)", padding: "3px 0" }}>
              ⚠ Paste a JD in the bar above for a tailored letter
            </div>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="btn btn-accent mono"
            style={{ width: "100%", justifyContent: "center", height: 32 }}
          >
            <Icon name="sparkle" size={11} />
            {loading ? "generating…" : "generate cover letter"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: "10px 12px", padding: "8px 12px", background: "color-mix(in oklch, var(--red) 10%, var(--bg-1))", border: "1px solid color-mix(in oklch, var(--red) 30%, transparent)", borderRadius: 6, fontSize: 12, color: "var(--red)" }}>
          {error}
        </div>
      )}

      {/* Letter output */}
      {letter && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
            <button onClick={copy} className="btn btn-ghost mono" style={{ height: 24, fontSize: 11 }}>
              <Icon name="check" size={10} /> {copied ? "copied!" : "copy"}
            </button>
            <button onClick={download} className="btn btn-ghost mono" style={{ height: 24, fontSize: 11 }}>
              <Icon name="download" size={10} /> .txt
            </button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "14px 14px" }}>
            <pre style={{
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.65,
              color: "var(--fg-0)", margin: 0,
            }}>{letter}</pre>
          </div>
        </div>
      )}

      {!letter && !loading && !error && (
        <EmptyState msg="Fill in company + role above, then click generate." />
      )}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", color: "var(--fg-3)" }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: 12, color: "var(--fg-2)" }}>
        <Icon name="doc" size={16} />
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 240 }}>{msg}</div>
    </div>
  );
}
