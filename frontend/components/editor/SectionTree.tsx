"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";
import type { ResumeContent, Resume } from "@/types/resume";

type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications";

interface SectionTreeProps {
  resume: ResumeContent | null;
  active: SectionId;
  onSelect: (id: SectionId) => void;
  heatmap: boolean;
  currentResumeId: string | null;
  onSwitchResume: (resume: Resume) => void;
  onNewResume: () => void;
  resumeTitle?: string;
}

const SECTION_META: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "contact",        label: "contact.tsx",       icon: "user" },
  { id: "summary",        label: "summary.md",        icon: "summary" },
  { id: "experience",     label: "experience/",       icon: "briefcase" },
  { id: "education",      label: "education.tsx",     icon: "cap" },
  { id: "skills",         label: "skills.json",       icon: "wrench" },
  { id: "certifications", label: "certifications.md", icon: "badge" },
  { id: "projects",       label: "projects/",         icon: "code" },
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
    case "certifications":
      return (resume.certifications ?? []).length ? "green" : null;
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

/* ── Google Drive save hook ── */
function useDriveSave() {
  const [driveToken, setDriveToken] = useState<string | null>(
    typeof window !== "undefined" ? sessionStorage.getItem("gdrive_token") : null
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connect = async () => {
    setConnectError(null);
    setPopupBlocked(false);
    try {
      const { url } = await api.getDriveAuthUrl();
      const popup = window.open(url, "gdrive-auth", "width=520,height=620,left=200,top=80,toolbar=0,menubar=0");
      if (!popup || popup.closed) {
        setPopupBlocked(true);
        return;
      }
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "GDRIVE_TOKEN" && e.data.token) {
          setDriveToken(e.data.token);
          sessionStorage.setItem("gdrive_token", e.data.token);
          window.removeEventListener("message", handler);
          popup.close();
        }
      };
      window.addEventListener("message", handler);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectError(msg.includes("GOOGLE_CLIENT_ID") || msg.includes("client_id")
        ? "Google OAuth not configured. Add GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET to backend .env."
        : "Failed to open Drive auth. Check backend .env.");
    }
  };

  const disconnect = () => {
    setDriveToken(null);
    sessionStorage.removeItem("gdrive_token");
    setStatus("idle");
    setConnectError(null);
    setPopupBlocked(false);
  };

  const save = async (title: string, content: ResumeContent) => {
    if (!driveToken) { await connect(); return; }
    setSaving(true); setStatus("idle");
    try {
      const html = buildResumeHtml(content, title);
      await api.saveToDrive(driveToken, `${title}.html`, html);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setDriveToken(null);
      sessionStorage.removeItem("gdrive_token");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  };

  return { driveToken, saving, status, popupBlocked, connectError, connect, disconnect, save };
}

function buildResumeHtml(c: ResumeContent, title: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const contact = c.contact ?? {};
  const skills = [...(c.skills?.technical ?? []), ...(c.skills?.soft ?? [])];

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 32px;color:#111;line-height:1.6}
  h1{font-size:26px;margin:0 0 4px}
  .contact{font-size:12px;color:#555;margin-bottom:20px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;border-bottom:1px solid #999;padding-bottom:3px;margin:18px 0 8px;color:#333}
  .role{font-weight:bold} .date{float:right;color:#777;font-size:12px} .title{font-style:italic;color:#555;font-size:13px}
  ul{margin:4px 0 0;padding-left:18px} li{font-size:13px;margin-bottom:2px}
  .skills{font-size:13px;line-height:1.9}
</style></head><body>
<h1>${esc(contact.name || "")}</h1>
<div class="contact">${[contact.email,contact.phone,contact.location,contact.linkedin,contact.github].filter(Boolean).map(esc).join("  ·  ")}</div>
${c.summary ? `<h2>Summary</h2><p style="font-size:13px">${esc(c.summary)}</p>` : ""}
${(c.experience ?? []).length ? `<h2>Experience</h2>${(c.experience??[]).map(e=>`<div><span class="role">${esc(e.company)}</span><span class="date">${esc(e.start)}–${esc(e.end??"Present")}</span><div class="title">${esc(e.title)}</div><ul>${(e.bullets??[]).map(b=>`<li>${esc(b)}</li>`).join("")}</ul></div>`).join("")}` : ""}
${(c.education ?? []).length ? `<h2>Education</h2>${(c.education??[]).map(e=>`<div><span class="role">${esc(e.institution)}</span><span class="date">${esc(e.year??"")}</span><div class="title">${esc(e.degree)}${e.field?" in "+esc(e.field):""}</div></div>`).join("")}` : ""}
${skills.length ? `<h2>Skills</h2><div class="skills">${skills.map(esc).join("  ·  ")}</div>` : ""}
${(c.projects ?? []).length ? `<h2>Projects</h2>${(c.projects??[]).map(p=>`<div><span class="role">${esc(p.name)}</span>${p.technologies?.length?` <span style="font-size:11px;color:#888">${p.technologies.map(esc).join(", ")}</span>`:""}${p.description?`<div style="font-size:13px">${esc(p.description)}</div>`:""}</div>`).join("")}` : ""}
${(c.certifications ?? []).length ? `<h2>Certifications</h2><ul>${(c.certifications??[]).map(cert=>`<li>${esc(typeof cert==="string"?cert:(cert as any).name??"")}</li>`).join("")}</ul>` : ""}
</body></html>`;
}

/* ── Main component ── */
export function SectionTree({
  resume, active, onSelect, heatmap,
  currentResumeId, onSwitchResume, onNewResume, resumeTitle,
}: SectionTreeProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drive = useDriveSave();

  const loadResumes = () => {
    setLoadingList(true);
    api.listResumes()
      .then(r => setResumes(r))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    if (showSwitcher) loadResumes();
  }, [showSwitcher]);

  useEffect(() => {
    if (!showSwitcher) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
        setConfirmId(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSwitcher]);

  const handleDelete = async (r: Resume, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmId !== r.id) { setConfirmId(r.id); return; }
    setDeletingId(r.id);
    setConfirmId(null);
    try {
      await api.deleteResume(r.id);
      setResumes(prev => prev.filter(x => x.id !== r.id));
      if (r.id === currentResumeId) onNewResume();
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  return (
    <aside style={{
      background: "var(--bg-1)",
      borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column",
      minHeight: 0, overflow: "hidden",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{
        height: 34, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px", borderBottom: "1px solid var(--line)", color: "var(--fg-3)",
      }}>
        <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>resume</span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            className="btn btn-ghost"
            style={{ width: 22, height: 22, padding: 0, justifyContent: "center" }}
            title="Switch resume"
            onClick={() => setShowSwitcher(v => !v)}
          >
            <Icon name="branch" size={12} />
          </button>
        </div>
      </div>

      {/* Resume switcher panel */}
      {showSwitcher && (
        <div ref={panelRef} style={{
          position: "absolute", top: 34, left: 0, right: 0,
          background: "var(--bg-1)", border: "1px solid var(--line)",
          borderTop: "none", zIndex: 20,
          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.4)",
          display: "flex", flexDirection: "column", maxHeight: "60vh",
        }}>
          {/* Drive save row */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Google Drive logo mark */}
              <svg width="13" height="11" viewBox="0 0 87 78" style={{ flexShrink: 0 }}>
                <path d="M6.1 66.5l4.5 7.8c.9 1.6 2.3 2.8 3.8 3.6L28.9 52H0c0 1.8.5 3.6 1.4 5.2l4.7 9.3z" fill="#0066DA"/>
                <path d="M43.5 25L28.9 0c-1.5.8-2.9 2-3.8 3.6L1.4 46.8c-.9 1.6-1.4 3.4-1.4 5.2h28.9L43.5 25z" fill="#00AC47"/>
                <path d="M72.6 78c1.5-.8 2.9-2 3.8-3.6l1.8-3.1 8.6-14.9c.9-1.6 1.4-3.4 1.4-5.2H59.1L72.6 78z" fill="#EA4335"/>
                <path d="M43.5 25L58.1 0H14.2C12.1 0 10.1.5 8.4 1.4L43.5 25z" fill="#00832D"/>
                <path d="M59.1 52H87L72.6 26.2 43.5 25 28.9 52h30.2z" fill="#2684FC"/>
                <path d="M43.5 25L8.4 1.4C6.7 2.3 5.3 3.6 4.4 5.2L43.5 25zM87 52H59.1L72.6 78c1.5-.8 2.9-2 3.8-3.6L87 52z" fill="#FFBA00"/>
              </svg>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)", flex: 1 }}>
                {drive.driveToken ? "Drive connected" : "Google Drive"}
              </span>
              {drive.driveToken && (
                <button
                  onClick={drive.disconnect}
                  className="mono"
                  title="Disconnect"
                  style={{ fontSize: 10, color: "var(--fg-4)", background: "none", border: 0, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}
                >✕</button>
              )}
              <button
                onClick={async () => {
                  if (!drive.driveToken) { await drive.connect(); return; }
                  if (resume && resumeTitle) await drive.save(resumeTitle, resume);
                }}
                disabled={drive.saving}
                className="btn mono"
                style={{
                  height: 24, fontSize: 10.5, padding: "0 9px", flexShrink: 0,
                  background: drive.status === "success" ? "color-mix(in oklch, var(--green) 12%, var(--bg-2))"
                    : drive.status === "error" ? "color-mix(in oklch, var(--red) 12%, var(--bg-2))"
                    : drive.driveToken ? "var(--bg-2)" : "color-mix(in oklch, #4285f4 10%, var(--bg-2))",
                  color: drive.status === "success" ? "var(--green)"
                    : drive.status === "error" ? "var(--red)"
                    : drive.driveToken ? "var(--fg-1)" : "#4285f4",
                  border: `1px solid ${drive.driveToken ? "var(--line)" : "#4285f4"}`,
                  borderRadius: 5,
                }}
              >
                {drive.saving ? "saving…"
                  : drive.status === "success" ? "✓ saved!"
                  : drive.status === "error" ? "retry"
                  : drive.driveToken ? "save now"
                  : "connect"}
              </button>
            </div>

            {/* Error / popup blocked messages */}
            {drive.connectError && (
              <div className="mono" style={{ fontSize: 10, color: "var(--red)", marginTop: 6, lineHeight: 1.5 }}>
                {drive.connectError}
              </div>
            )}
            {drive.popupBlocked && (
              <div className="mono" style={{ fontSize: 10, color: "var(--amber)", marginTop: 6, lineHeight: 1.5 }}>
                Popup was blocked. Allow popups for this site and click connect again.
              </div>
            )}
          </div>

          {/* Resume list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div style={{ padding: "8px 10px 4px" }}>
              <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                your resumes
              </div>
              {loadingList && (
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", padding: "4px 0" }}>loading…</div>
              )}
              {resumes.map(r => {
                const isActive = r.id === currentResumeId;
                const isConfirm = confirmId === r.id;
                const isDeleting = deletingId === r.id;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      borderRadius: 5, marginBottom: 1,
                      background: isActive ? "var(--bg-3)" : "transparent",
                      padding: "2px 4px",
                    }}
                    onMouseLeave={() => { if (confirmId === r.id) setConfirmId(null); }}
                  >
                    {/* Resume name button */}
                    <button
                      onClick={() => { if (!isActive) { onSwitchResume(r); setShowSwitcher(false); setConfirmId(null); } }}
                      className="mono"
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "4px 4px", border: 0, minWidth: 0,
                        background: "transparent",
                        color: isActive ? "var(--accent)" : "var(--fg-1)",
                        fontSize: 11.5, cursor: isActive ? "default" : "pointer", textAlign: "left", gap: 6,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                        {isActive && <span style={{ color: "var(--accent)", fontSize: 8, flexShrink: 0 }}>●</span>}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.title}
                        </span>
                      </span>
                      {r.ats_score != null && (
                        <span style={{
                          fontSize: 10, flexShrink: 0,
                          color: r.ats_score >= 80 ? "var(--green)" : r.ats_score >= 60 ? "var(--amber)" : "var(--red)",
                        }}>
                          {r.ats_score}
                        </span>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(r, e)}
                      disabled={isDeleting}
                      title={isConfirm ? "Click again to confirm" : "Delete"}
                      className="mono"
                      style={{
                        flexShrink: 0, height: 22, padding: "0 6px", borderRadius: 4, border: 0,
                        fontSize: 10, cursor: "pointer",
                        background: isConfirm
                          ? "color-mix(in oklch, var(--red) 15%, var(--bg-2))"
                          : "transparent",
                        color: isConfirm ? "var(--red)" : "var(--fg-4)",
                        transition: "background 0.15s, color 0.15s",
                        display: "flex", alignItems: "center", gap: 3,
                      }}
                      onMouseEnter={e => {
                        if (!isConfirm) (e.currentTarget as HTMLElement).style.color = "var(--red)";
                      }}
                      onMouseLeave={e => {
                        if (!isConfirm) (e.currentTarget as HTMLElement).style.color = "var(--fg-4)";
                      }}
                    >
                      {isDeleting ? "…" : isConfirm ? "confirm?" : <Icon name="x" size={10} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid var(--line)", padding: "4px 10px 8px" }}>
            <button
              onClick={() => { onNewResume(); setShowSwitcher(false); }}
              className="btn btn-ghost mono"
              style={{ width: "100%", height: 26, fontSize: 11, justifyContent: "flex-start", color: "var(--fg-2)" }}
            >
              <Icon name="plus" size={11} /> new resume
            </button>
          </div>
        </div>
      )}

      {/* Section list */}
      <div style={{ padding: "8px 6px", overflow: "auto", flex: 1 }}>
        {!resume ? (
          <div className="mono" style={{ padding: "16px 10px", fontSize: 11, color: "var(--fg-4)", lineHeight: 1.6 }}>
            Upload or paste a resume to see sections.
          </div>
        ) : (
          <>
            {SECTION_META.map((s) => {
              if (s.id === "contact"        && !resume.contact?.name && !resume.contact?.email) return null;
              if (s.id === "summary"        && !resume.summary)                                  return null;
              if (s.id === "experience"     && !(resume.experience?.length))                     return null;
              if (s.id === "education"      && !(resume.education?.length))                      return null;
              if (s.id === "skills"         && !(resume.skills?.technical?.length))              return null;
              if (s.id === "certifications" && !(resume.certifications?.length))                 return null;
              if (s.id === "projects"       && !(resume.projects?.length))                       return null;

              const isActive = active === s.id;
              const heat = heatmap ? sectionHeat(s.id, resume) : null;
              const heatColor = heat === "red" ? "var(--red)" : heat === "amber" ? "var(--amber)" : heat === "green" ? "var(--green)" : null;

              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className="mono"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 8px", fontSize: 12, borderRadius: 5,
                    background: isActive ? "var(--bg-3)" : "transparent",
                    color: isActive ? "var(--fg-0)" : "var(--fg-1)",
                    cursor: "pointer", textAlign: "left", border: 0, position: "relative",
                  }}
                >
                  {isActive && <span style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 2, background: "var(--accent)", borderRadius: 1 }} />}
                  <Icon name={s.icon} size={13} />
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {heatColor && <span style={{ width: 6, height: 6, borderRadius: 99, background: heatColor }} />}
                </button>
              );
            })}

            {resume.experience && resume.experience.length > 0 && (
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
          </>
        )}
      </div>

      {/* Outline footer */}
      {resume && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "10px 12px" }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>outline</div>
          {resume.contact?.name         && <Mini label="contact"    v="header" />}
          {resume.summary               && <Mini label="summary"    v={`${resume.summary.split(/\s+/).filter(Boolean).length} words`} />}
          {(resume.experience?.length ?? 0) > 0 && <Mini label="experience" v={`${resume.experience!.length} roles`} />}
          {(resume.education?.length  ?? 0) > 0 && <Mini label="education"  v={`${resume.education!.length} deg.`} />}
          {(resume.skills?.technical?.length ?? 0) > 0 && <Mini label="skills" v={`${resume.skills!.technical!.length} items`} />}
          {(resume.projects?.length   ?? 0) > 0 && <Mini label="projects"   v={`${resume.projects!.length} listed`} />}
        </div>
      )}
    </aside>
  );
}
