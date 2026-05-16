"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ResumeContent } from "@/types/resume";

interface InterviewPrepPaneProps {
  resumeId: string | null;
  resume: ResumeContent | null;
  jd: string;
}

type Focus = "all" | "behavioral" | "technical" | "situational";

interface ParsedQuestion {
  prefix: string;
  question: string;
  hint: string;
  type: "BEHAVIORAL" | "TECHNICAL" | "SITUATIONAL" | "GENERAL";
}

function parseQuestions(raw: string): ParsedQuestion[] {
  const blocks = raw.split(/\n(?=Q:)/g).filter(b => b.trim());
  return blocks.map(block => {
    const qMatch = block.match(/Q:\s*([\s\S]+?)(?=\nHINT:|$)/);
    const hMatch = block.match(/HINT:\s*([\s\S]+?)(?=\n(?:Q:|$)|$)/);
    const q = qMatch?.[1]?.trim() ?? block.trim();
    const hint = hMatch?.[1]?.trim() ?? "";
    const typeMatch = q.match(/^\[(BEHAVIORAL|TECHNICAL|SITUATIONAL)\]/);
    const type = (typeMatch?.[1] ?? "GENERAL") as ParsedQuestion["type"];
    const question = q.replace(/^\[.*?\]\s*/, "");
    const colors: Record<string, string> = {
      BEHAVIORAL: "var(--blue)",
      TECHNICAL: "var(--accent)",
      SITUATIONAL: "var(--amber)",
      GENERAL: "var(--fg-3)",
    };
    return { prefix: type, question, hint, type, };
  });
}

const TYPE_COLORS: Record<string, string> = {
  BEHAVIORAL: "var(--blue)",
  TECHNICAL: "var(--accent)",
  SITUATIONAL: "var(--amber)",
  GENERAL: "var(--fg-3)",
};

export function InterviewPrepPane({ resumeId, resume, jd }: InterviewPrepPaneProps) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [focus, setFocus] = useState<Focus>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!resumeId) return;
    setLoading(true); setError(null); setQuestions([]); setExpandedIdx(null);
    try {
      const token = JSON.parse(localStorage.getItem("resume-agent-auth") ?? "{}").state?.token ?? "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/resumes/${resumeId}/interview-prep`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ job_description: jd, company, role, focus }),
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setQuestions(parseQuestions(data.questions ?? ""));
    } catch {
      setError("Failed to generate questions. Make sure a resume is open.");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    const text = questions.map((q, i) =>
      `${i + 1}. [${q.type}] ${q.question}\n   → ${q.hint}`
    ).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!resumeId) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", color: "var(--fg-3)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: 12 }}>
          <Icon name="sparkle" size={16} />
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 220 }}>Open a resume to generate tailored interview questions.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Config */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          interview prep
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" className="mono"
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 5, padding: "6px 9px", fontSize: 12, color: "var(--fg-0)", flex: 1, minWidth: 0 }} />
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role" className="mono"
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 5, padding: "6px 9px", fontSize: 12, color: "var(--fg-0)", flex: 1, minWidth: 0 }} />
          </div>
          {/* Focus tabs */}
          <div style={{ display: "flex", background: "var(--bg-2)", borderRadius: 5, border: "1px solid var(--line)", padding: 2 }}>
            {(["all", "behavioral", "technical", "situational"] as Focus[]).map(f => (
              <button key={f} onClick={() => setFocus(f)} className="mono" style={{
                flex: 1, height: 24, fontSize: 10, textTransform: "capitalize",
                background: focus === f ? "var(--bg-0)" : "transparent",
                color: focus === f ? "var(--accent)" : "var(--fg-3)",
                border: 0, borderRadius: 4, cursor: "pointer",
                boxShadow: focus === f ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}>{f}</button>
            ))}
          </div>
          {!jd && (
            <div className="mono" style={{ fontSize: 10.5, color: "var(--amber)" }}>
              ⚠ Paste a JD above for tailored technical questions
            </div>
          )}
          <button onClick={generate} disabled={loading} className="btn btn-accent mono" style={{ width: "100%", justifyContent: "center", height: 32 }}>
            <Icon name="sparkle" size={11} />
            {loading ? "generating…" : questions.length ? "regenerate" : "generate 10 questions"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ margin: "10px 12px", padding: "8px 12px", background: "color-mix(in oklch, var(--red) 10%, var(--bg-1))", border: "1px solid color-mix(in oklch, var(--red) 30%, transparent)", borderRadius: 6, fontSize: 12, color: "var(--red)", flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Questions list */}
      {questions.length > 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 12px", borderBottom: "1px solid var(--line)",
            background: "var(--bg-2)", flexShrink: 0,
          }}>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
              {questions.length} questions · click to see hint
            </span>
            <button onClick={copyAll} className="btn btn-ghost mono" style={{ height: 24, fontSize: 11 }}>
              <Icon name="copy" size={10} /> {copied ? "copied!" : "copy all"}
            </button>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "8px 10px 16px" }}>
            {questions.map((q, i) => {
              const color = TYPE_COLORS[q.type] || "var(--fg-3)";
              const isOpen = expandedIdx === i;
              return (
                <div key={i} style={{
                  border: `1px solid ${isOpen ? color : "var(--line)"}`,
                  borderRadius: 8, marginBottom: 6, overflow: "hidden",
                  background: isOpen ? `color-mix(in oklch, ${color} 4%, var(--bg-0))` : "var(--bg-0)",
                  transition: "border-color 0.2s, background 0.2s",
                }}>
                  <button
                    onClick={() => setExpandedIdx(isOpen ? null : i)}
                    style={{
                      width: "100%", textAlign: "left", background: "transparent",
                      border: 0, cursor: "pointer", padding: "10px 12px",
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}
                  >
                    <span className="mono" style={{ color: "var(--fg-4)", fontSize: 10, flexShrink: 0, paddingTop: 2 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <span className="mono" style={{
                          fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 700,
                          background: `color-mix(in oklch, ${color} 12%, transparent)`,
                          border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
                          color,
                        }}>{q.type}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-0)", lineHeight: 1.5 }}>{q.question}</div>
                    </div>
                    <span style={{ color: "var(--fg-4)", fontSize: 12, paddingTop: 2, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && q.hint && (
                    <div style={{
                      padding: "0 12px 12px 34px",
                      borderTop: `1px solid color-mix(in oklch, ${color} 20%, transparent)`,
                      marginTop: 0, paddingTop: 10,
                    }}>
                      <div className="mono" style={{ fontSize: 9.5, color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                        💡 how to answer
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-1)", lineHeight: 1.6 }}>{q.hint}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!questions.length && !loading && !error && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", color: "var(--fg-3)" }}>
          <div style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 240 }}>
            Get 10 tailored questions with hints based on your resume + JD. Click expand for answer guidance.
          </div>
        </div>
      )}
    </div>
  );
}
