"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ResumeContent } from "@/types/resume";

interface CoverLetterPaneProps {
  resumeId: string | null;
  resume: ResumeContent | null;
  jd: string;
}

export function CoverLetterPane({ resumeId, resume, jd }: CoverLetterPaneProps) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "concise">("professional");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"text" | "full" | null>(null);
  const [editing, setEditing] = useState(false);

  const contact = resume?.contact;
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const buildHeader = () => {
    if (!contact) return "";
    const parts = [
      contact.name,
      [contact.email, contact.phone].filter(Boolean).join(" · "),
      contact.location,
    ].filter(Boolean);
    return parts.join("\n");
  };

  const fullText = () => {
    const header = buildHeader();
    const heading = [today, "", company && `Hiring Team, ${company}`, ""].filter(s => s !== undefined).join("\n");
    return [header, "", heading, letter].join("\n").trim();
  };

  const generate = async () => {
    if (!resumeId) return;
    setLoading(true); setError(null); setLetter(""); setEditing(false);
    try {
      const token = JSON.parse(localStorage.getItem("resume-agent-auth") ?? "{}").state?.token ?? "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/resumes/${resumeId}/cover-letter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            job_description: jd,
            company: company || "the company",
            role: role || "this role",
            tone,
          }),
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setLetter(data.cover_letter ?? "");
    } catch {
      setError("Failed to generate. Make sure a resume is open and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (mode: "text" | "full") => {
    const content = mode === "full" ? fullText() : letter;
    await navigator.clipboard.writeText(content);
    setCopied(mode);
    setTimeout(() => setCopied(null), 1800);
  };

  const download = (kind: "txt" | "md") => {
    const content = fullText();
    const blob = new Blob([content], { type: kind === "md" ? "text/markdown" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeCo = (company || "company").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    a.href = url;
    a.download = `cover-letter-${safeCo}.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!resumeId) {
    return <EmptyState msg="Create or open a resume first to generate a cover letter." />;
  }

  const wordCount = letter.trim() ? letter.trim().split(/\s+/).length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Config */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div className="mono" style={{
          fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase",
          letterSpacing: "0.08em", marginBottom: 8,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>cover letter</span>
          {wordCount > 0 && <span style={{ color: "var(--fg-4)" }}>{wordCount} words</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Company name"
              className="mono"
              style={{
                background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 5,
                padding: "6px 9px", fontSize: 12, color: "var(--fg-0)", flex: 1, minWidth: 0,
              }}
            />
            <input
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Role"
              className="mono"
              style={{
                background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 5,
                padding: "6px 9px", fontSize: 12, color: "var(--fg-0)", flex: 1, minWidth: 0,
              }}
            />
          </div>
          {/* Tone segmented */}
          <div style={{
            display: "flex", background: "var(--bg-2)", borderRadius: 5,
            border: "1px solid var(--line)", padding: 2,
          }}>
            {(["professional", "enthusiastic", "concise"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className="mono"
                style={{
                  flex: 1, height: 24, fontSize: 11, textTransform: "capitalize",
                  background: tone === t ? "var(--bg-0)" : "transparent",
                  color: tone === t ? "var(--accent)" : "var(--fg-2)",
                  border: 0, borderRadius: 4, cursor: "pointer",
                  boxShadow: tone === t ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {t}
              </button>
            ))}
          </div>
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
            {loading ? "generating…" : letter ? "regenerate" : "generate cover letter"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: "10px 12px", padding: "8px 12px",
          background: "color-mix(in oklch, var(--red) 10%, var(--bg-1))",
          border: "1px solid color-mix(in oklch, var(--red) 30%, transparent)",
          borderRadius: 6, fontSize: 12, color: "var(--red)", flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Letter output */}
      {letter && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            display: "flex", gap: 4, padding: "6px 10px",
            borderBottom: "1px solid var(--line)", flexShrink: 0,
            background: "var(--bg-2)",
            alignItems: "center",
          }}>
            <button
              onClick={() => setEditing(e => !e)}
              className="btn btn-ghost mono"
              style={{ height: 24, fontSize: 11, color: editing ? "var(--accent)" : "var(--fg-2)" }}
              title="Toggle edit mode"
            >
              <Icon name={editing ? "check" : "edit"} size={10} />
              {editing ? "done" : "edit"}
            </button>
            <div style={{ width: 1, height: 14, background: "var(--line)", margin: "0 4px" }} />
            <button onClick={() => copy("text")} className="btn btn-ghost mono" style={{ height: 24, fontSize: 11 }}>
              <Icon name="copy" size={10} />
              {copied === "text" ? "copied!" : "body"}
            </button>
            <button onClick={() => copy("full")} className="btn btn-ghost mono" style={{ height: 24, fontSize: 11 }}>
              <Icon name="copy" size={10} />
              {copied === "full" ? "copied!" : "all"}
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => download("txt")} className="btn btn-ghost mono" style={{ height: 24, fontSize: 11 }}>
              <Icon name="download" size={10} /> .txt
            </button>
            <button onClick={() => download("md")} className="btn btn-ghost mono" style={{ height: 24, fontSize: 11 }}>
              <Icon name="download" size={10} /> .md
            </button>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
            {/* Letterhead preview */}
            {contact?.name && (
              <div style={{
                paddingBottom: 12, marginBottom: 14,
                borderBottom: "1px dashed var(--line)",
                fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.55,
                color: "var(--fg-2)",
              }}>
                <div style={{ fontWeight: 600, color: "var(--fg-0)", fontSize: 13 }}>{contact.name}</div>
                {(contact.email || contact.phone) && (
                  <div>{[contact.email, contact.phone].filter(Boolean).join(" · ")}</div>
                )}
                {contact.location && <div>{contact.location}</div>}
                <div style={{ marginTop: 10, color: "var(--fg-3)" }}>{today}</div>
                {company && <div style={{ marginTop: 6 }}>Hiring Team, {company}</div>}
              </div>
            )}

            {editing ? (
              <textarea
                value={letter}
                onChange={e => setLetter(e.target.value)}
                style={{
                  width: "100%", minHeight: 320, resize: "vertical",
                  background: "var(--bg-0)", border: "1px solid var(--accent-line)",
                  borderRadius: 6, padding: 12,
                  fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.65,
                  color: "var(--fg-0)", outline: "none",
                }}
                autoFocus
              />
            ) : (
              <pre style={{
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.65,
                color: "var(--fg-0)", margin: 0,
              }}>{letter}</pre>
            )}
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
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, textAlign: "center", color: "var(--fg-3)",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, background: "var(--bg-2)",
        border: "1px solid var(--line)", display: "grid", placeItems: "center",
        marginBottom: 12, color: "var(--fg-2)",
      }}>
        <Icon name="doc" size={16} />
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 240 }}>{msg}</div>
    </div>
  );
}
