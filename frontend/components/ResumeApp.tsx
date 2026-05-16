"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useResumeStore } from "@/store/resumeStore";
import { useResumeWebSocket } from "@/hooks/useWebSocket";
import { useAutosave } from "@/hooks/useAutosave";
import { api } from "@/lib/api";
import { getVersions, restoreVersion } from "@/lib/db";

import { Landing } from "@/components/landing/Landing";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuthStore } from "@/store/authStore";
import { TopBar, FloatingActions } from "@/components/editor/TopBar";
import { JDBar } from "@/components/editor/JDBar";
import { SectionTree } from "@/components/editor/SectionTree";
import { Canvas } from "@/components/editor/Canvas";
import { RightRail } from "@/components/editor/RightRail";
import type { VersionEntry } from "@/components/editor/RightRail";
import { StatusBar } from "@/components/editor/StatusBar";
import { CommandPalette } from "@/components/editor/CommandPalette";
import { PrintPreview } from "@/components/editor/PrintPreview";
import { TemplatePicker, MinimalTemplate, ClassicTemplate, ModernTemplate, ExecutiveTemplate, CompactTemplate, CreativeTemplate } from "@/components/editor/TemplatePicker";
import type { TemplateId } from "@/components/editor/TemplatePicker";
import { ShortcutOverlay } from "@/components/editor/ShortcutOverlay";
import { VersionDiffViewer } from "@/components/editor/VersionDiffViewer";
import { OnboardingWizard } from "@/components/editor/OnboardingWizard";
import { exportATSPlainText } from "@/lib/exportPlainText";
import type { DiffPatch } from "@/types/resume";
import { DEFAULT_STYLE } from "@/types/resume";
import type { ResumeStyle } from "@/types/resume";

type Screen = "landing" | "editor";
type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications";
type RailTab = "ai" | "ats" | "versions" | "cover" | "interview" | "style";

export function ResumeApp() {
  const { resume, ai, editor, ats, setResume, markDirty, acceptAISuggestion, rejectAISuggestion, acceptPatch, setATS, setResumeTitle } = useResumeStore();
  const { isAuthenticated } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  const [screen, setScreen] = useState<Screen>("landing");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [rawText, setRawText] = useState("");
  const [jd, setJD] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("summary");
  const [railTab, setRailTab] = useState<RailTab>("ai");
  const [heatmap, setHeatmap] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [aiState, setAIState] = useState<"idle" | "streaming" | "review" | "accepted">("idle");
  const [aiError, setAIError] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [printing, setPrinting] = useState(false);
  const [template, setTemplate] = useState<TemplateId>("classic");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showVersionDiff, setShowVersionDiff] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [resumeStyle, setResumeStyle] = useState<ResumeStyle>({ ...DEFAULT_STYLE });

  const buildDriveHtml = useMemo(() => () => {
    if (!resume?.content) return "";
    const TemplateMap = { minimal: MinimalTemplate, classic: ClassicTemplate, modern: ModernTemplate, executive: ExecutiveTemplate, compact: CompactTemplate, creative: CreativeTemplate };
    const Tmpl = TemplateMap[template];
    const body = renderToStaticMarkup(<Tmpl resume={resume.content} resumeStyle={resumeStyle} />);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${resume.title ?? "resume"}</title><style>*{box-sizing:border-box}body{margin:0;padding:0}</style></head><body>${body}</body></html>`;
  }, [resume, template, resumeStyle]);

  // Persist last resumeId across reloads
  useEffect(() => {
    if (resumeId) localStorage.setItem("last_resume_id", resumeId);
  }, [resumeId]);

  // On mount: restore last session if authenticated; show onboarding for new users
  useEffect(() => {
    if (!isAuthenticated()) { setRestoring(false); return; }
    const saved = localStorage.getItem("last_resume_id");
    const onboarded = localStorage.getItem("resume-agent-onboarded");
    if (!onboarded) setShowOnboarding(true);
    if (!saved) { setRestoring(false); return; }
    api.getResume(saved)
      .then(r => {
        setResume(r);
        setResumeId(r.id);
        setScreen("editor");
      })
      .catch(() => {
        localStorage.removeItem("last_resume_id");
      })
      .finally(() => setRestoring(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { requestAI, cancelAI, requestGhost } = useResumeWebSocket(resumeId, (msg) => {
    setAIError(msg);
    setAIState("idle");
    setRailTab("ai");
  });
  const { saveBeforeAI } = useAutosave(resumeId);

  // Sync aiState from store
  useEffect(() => {
    if (ai.isStreaming) setAIState("streaming");
    else if (ai.pendingResult) { setAIState("review"); setRailTab("ai"); }
    else if (aiState === "streaming") setAIState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.isStreaming, ai.pendingResult]);

  // Auto-run ATS when resume loads and has content
  useEffect(() => {
    if (resumeId && resume?.content && (resume.content.summary || resume.content.experience?.length)) {
      handleATSAnalyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  // Auto-rerun ATS after edits (3s debounce, skip while AI is streaming)
  useEffect(() => {
    if (!resumeId || !resume?.content || ai.isStreaming) return;
    const t = setTimeout(() => {
      api.analyzeATS(resumeId, jd || undefined)
        .then(a => setATS(a))
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume?.content, jd]);

  // Keyboard shortcuts
  useEffect(() => {
    if (screen !== "editor") return;
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); }
      else if (mod && e.key === "Enter") { e.preventDefault(); handleAIRewrite(); }
      else if (mod && e.key.toLowerCase() === "h") { e.preventDefault(); setHeatmap(v => !v); }
      else if (e.key === "?" && !mod && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") { e.preventDefault(); setShowShortcuts(v => !v); }
      else if (e.key === "Escape") { setPaletteOpen(false); setShowShortcuts(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, resumeId, rawText, jd]);

  // Load versions when switching to versions tab
  useEffect(() => {
    if (railTab === "versions" && resumeId) {
      getVersions(resumeId).then(vs => {
        setVersions(vs.map((v, i) => ({
          id: String(v.savedAt),
          label: `v${vs.length - i}`,
          note: v.label || "Auto-save",
          time: formatTime(v.savedAt),
          score: undefined,
          current: i === 0,
        })));
      });
    }
  }, [railTab, resumeId]);

  const handleCreate = async (): Promise<string | null> => {
    setIsCreating(true);
    try {
      const r = await api.createResume("My Resume", rawText || undefined);
      setResume(r);
      setResumeId(r.id);
      setScreen("editor");
      markDirty(false);
      return r.id;
    } catch {
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleBoot = () => {
    if (!isAuthenticated()) { setShowAuth(true); return; }
    setScreen("editor");
  };

  const handleAIRewrite = async (section?: string) => {
    if (!resumeId && !rawText) return;
    let id = resumeId;
    if (!id) {
      id = await handleCreate();
      if (!id) return;
      // Wait one tick for WebSocket to connect with the new resumeId
      await new Promise(r => setTimeout(r, 600));
    }
    setAIError(null);
    await saveBeforeAI();
    requestAI(rawText, jd || undefined, section);
    setRailTab("ai");
  };

  const handleSectionRewrite = (section: string) => handleAIRewrite(section);

  const handleATSAnalyze = async () => {
    if (!resumeId) return;
    setRailTab("ats");
    try {
      const analysis = await api.analyzeATS(resumeId, jd || undefined);
      setATS(analysis);
    } catch (err) {
      console.error("ATS analysis failed", err);
    }
  };

  const handleATSFix = async () => {
    if (!resumeId || !ats || !resume?.content) return;
    const failing = ats.checkpoints.filter(c => !c.passed);
    const missing = ats.missing_keywords.slice(0, 10);

    // Map every checkpoint label to the section it belongs to
    const CHECKPOINT_SECTION_MAP: Record<string, string> = {
      "email address present":              "contact",
      "phone number present":               "contact",
      "linkedin url present":               "contact",
      "github url present":                 "contact",
      "professional summary present":       "summary",
      "summary is 2-4 sentences":           "summary",
      "summary has keywords":               "summary",
      "work experience section present":    "experience",
      "experience entries include dates":   "experience",
      "experience has achievement bullets": "experience",
      "bullets start with action verbs":    "experience",
      "bullets include quantified results": "experience",
      "education section present":          "education",
      "education includes degree type":     "education",
      "skills section present":             "skills",
      "skills section has 5+ items":        "skills",
      "certifications present":             "certifications",
      "projects present":                   "projects",
    };

    // Group failing checkpoints by section
    const sectionIssues: Record<string, string[]> = {};
    const unmapped: string[] = [];
    for (const c of failing) {
      const sec = CHECKPOINT_SECTION_MAP[c.label.toLowerCase()];
      if (sec) {
        (sectionIssues[sec] ??= []).push(c.label);
      } else {
        unmapped.push(c.label);
      }
    }

    // Add missing keywords to the most relevant section (experience, else summary)
    if (missing.length > 0) {
      const kwSection = sectionIssues["experience"] ? "experience" : "summary";
      (sectionIssues[kwSection] ??= []).push(
        `Incorporate these missing keywords naturally: ${missing.join(", ")}`
      );
    }

    const affectedSections = Object.keys(sectionIssues);

    // Fire one targeted AI call per affected section — never touch the rest
    setAIError(null);
    await saveBeforeAI();
    setRailTab("ai");

    // Specific guidance per checkpoint so the AI knows exactly what to do
    const CHECKPOINT_GUIDANCE: Record<string, string> = {
      "bullets include quantified results":
        "Add concrete numbers, percentages, or metrics to at least 2 bullets. Use realistic estimates based on context (e.g. 'reduced load time by 30%', 'served 500+ users', 'cut processing time by 2x'). Do NOT invent company names or job titles.",
      "bullets start with action verbs":
        "Start every bullet with a strong action verb (Led, Built, Designed, Implemented, Improved, Reduced, Delivered, etc.).",
      "summary is 2-4 sentences":
        "Rewrite the summary to be exactly 2-4 concise sentences.",
      "experience entries include dates":
        "Add start and end dates to every experience entry in MM-YYYY or YYYY format.",
      "skills section has 5+ items":
        "Add more technical skills to reach at least 5 items total.",
      "linkedin url present":
        "Add a placeholder LinkedIn URL if missing: linkedin.com/in/yourname",
    };

    for (const sec of affectedSections) {
      const issues = sectionIssues[sec];
      const instructionLines = issues.map(issue => {
        const guidance = CHECKPOINT_GUIDANCE[issue.toLowerCase()];
        return guidance ? `- ${issue}: ${guidance}` : `- ${issue}`;
      });
      const instructions = [
        `You are fixing ATS issues in the "${sec}" section ONLY.`,
        "Do NOT touch any other section. Preserve all other content exactly.",
        "",
        "Fix these specific issues:",
        ...instructionLines,
      ].join("\n");

      requestAI(JSON.stringify(resume.content), jd || undefined, sec, instructions);

      // Small gap between sequential section calls so the WS isn't flooded
      if (affectedSections.length > 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // If any checkpoints didn't map to a known section, log but skip
    if (unmapped.length > 0) {
      console.warn("ATS fix: unmapped checkpoints skipped:", unmapped);
    }
  };

  const handleExport = () => {
    if (resume?.content) { setShowTemplatePicker(true); return; }
    // fallback: download HTML from backend
    if (!resumeId) return;
    const { token } = useAuthStore.getState();
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/resumes/${resumeId}/export`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${resume?.title ?? "resume"}.html`; a.click();
      URL.revokeObjectURL(url);
    }).catch(e => console.error("Export failed", e));
  };

  const handleShare = async () => {
    if (!resumeId) return;
    const { token: authToken } = useAuthStore.getState();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/resumes/${resumeId}/share`,
        { method: "POST", headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = await res.json();
      const link = `${window.location.origin}/r/${data.token}`;
      await navigator.clipboard.writeText(link);
      alert(`Share link copied!\n\n${link}`);
    } catch { alert("Failed to generate share link."); }
  };

  const handleTitleChange = async (title: string) => {
    if (!resumeId || !title.trim()) return;
    setResumeTitle(title.trim());
    try { await api.updateResume(resumeId, { title: title.trim() }); } catch { /* silent */ }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!resumeId) return;
    const vs = await getVersions(resumeId);
    const v = vs.find(x => String(x.savedAt) === versionId);
    if (v && v.id != null) {
      const restored = await restoreVersion(v.id);
      if (restored) {
        await api.updateResume(resumeId, { content: restored.content });
        const updated = await api.getResume(resumeId);
        setResume(updated);
      }
    }
  };

  const handleAcceptAll = () => {
    acceptAISuggestion();
    setAIState("accepted");
    setTimeout(() => handleATSAnalyze(), 800);
  };

  const handleRejectAll = () => {
    rejectAISuggestion();
    setAIState("idle");
  };

  const handleAcceptPatch = (patch: DiffPatch) => {
    acceptPatch(patch);
  };

  const handleAutoAddKeywords = useCallback((keywords: string[]) => {
    if (!resume?.content) return;
    const current = resume.content.skills?.technical ?? [];
    const toAdd = keywords.filter(k => !current.map(s => s.toLowerCase()).includes(k.toLowerCase()));
    if (!toAdd.length) return;
    const updated = { ...resume.content, skills: { ...resume.content.skills, technical: [...current, ...toAdd] } };
    useResumeStore.getState().updateContent(updated);
  }, [resume?.content]);

  const handleVersionRestore = async (version: import("@/lib/db").ResumeVersion) => {
    if (!resumeId) return;
    setShowVersionDiff(false);
    await api.updateResume(resumeId, { content: version.content });
    const updated = await api.getResume(resumeId);
    setResume(updated);
  };

  const handleOnboardingComplete = (choice: "upload" | "scratch" | "sample") => {
    localStorage.setItem("resume-agent-onboarded", "1");
    setShowOnboarding(false);
    if (choice === "sample") {
      const SAMPLE = `John Smith\njohn.smith@email.com | +1 (555) 123-4567 | San Francisco, CA\nlinkedin.com/in/johnsmith | github.com/johnsmith\n\nSUMMARY\nSoftware Engineer with 4+ years of experience building scalable web applications.\n\nEXPERIENCE\nAcme Corp — Senior Software Engineer | Jan 2022 – Present\n• Led migration to microservices, reducing deployment time by 60%\n• Built real-time dashboard used by 10,000+ daily active users\n\nEDUCATION\nUniversity of California, Berkeley — B.S. Computer Science | 2020\n\nSKILLS\nJavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Docker, AWS`;
      setRawText(SAMPLE);
      handleAIRewrite();
    }
    // "upload" and "scratch" just close the wizard; user interacts normally
  };

  const handleCommand = useCallback((id: string) => {
    setPaletteOpen(false);
    if (id === "ai.rewrite") handleAIRewrite();
    else if (id === "ats.run") handleATSAnalyze();
    else if (id === "ats.heatmap") setHeatmap(v => !v);
    else if (id === "view.versions") setRailTab("versions");
    else if (id === "section.summary") setActiveSection("summary");
    else if (id === "section.exp") setActiveSection("experience");
    else if (id === "section.edu") setActiveSection("education");
    else if (id === "section.skills") setActiveSection("skills");
    else if (id === "export.pdf") handleExport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, rawText, jd]);

  const wordCount = (() => {
    if (resume?.content) {
      const c = resume.content;
      const text = [
        c.summary,
        ...(c.experience?.flatMap(e => e.bullets) ?? []),
        ...(c.projects?.map(p => p.description) ?? []),
      ].join(" ");
      return text.split(/\s+/).filter(Boolean).length;
    }
    return rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
  })();

  if (restoring) return null;

  if (screen === "landing") {
    return (
      <>
        <Landing onBoot={handleBoot} />
        {showAuth && (
          <AuthModal
            onSuccess={() => { setShowAuth(false); setScreen("editor"); }}
          />
        )}
      </>
    );
  }

  // Guard editor — if token was cleared (sign out) drop back to landing
  if (!isAuthenticated()) {
    return (
      <>
        <Landing onBoot={handleBoot} />
        <AuthModal onSuccess={() => { setShowAuth(false); setScreen("editor"); }} />
      </>
    );
  }

  return (
    <div style={{
      height: "100%",
      display: "grid",
      gridTemplateRows: "auto auto 1fr auto",
      background: "var(--bg-0)",
      overflow: "hidden",
    }}>
      <TopBar
        resumeTitle={resume?.title}
        onTitleChange={handleTitleChange}
        onPalette={() => setPaletteOpen(true)}
        onRunAI={() => handleAIRewrite()}
        onStopAI={() => { cancelAI(); setAIState("idle"); }}
        onBack={() => setScreen("landing")}
        aiState={aiState}
        isDirty={editor.isDirty}
      />

      <JDBar
        jd={jd}
        setJD={setJD}
        resume={resume?.content ?? null}
        onAutoAddKeywords={handleAutoAddKeywords}
      />

      {/* 3-pane */}
      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr) 400px", minHeight: 0, overflow: "hidden" }}>
        <SectionTree
          resume={resume?.content ?? null}
          active={activeSection}
          onSelect={setActiveSection}
          heatmap={heatmap}
          currentResumeId={resumeId}
          onSwitchResume={async (r) => {
            const full = await api.getResume(r.id);
            setResume(full);
            setResumeId(full.id);
            setRawText(full.raw_text ?? "");
            markDirty(false);
          }}
          onNewResume={() => {
            setResumeId(null);
            setRawText("");
            setResume(null);
            setATS(null);
            markDirty(false);
            localStorage.removeItem("last_resume_id");
            setScreen("editor");
          }}
          resumeTitle={resume?.title}
          buildDriveHtml={buildDriveHtml}
        />

        {!resumeId ? (
          /* Pre-create: resume import */
          <main style={{
            background: "var(--bg-0)",
            display: "flex", flexDirection: "column",
            minHeight: 0, borderRight: "1px solid var(--line)",
            overflow: "auto",
          }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 40px", minHeight: 0 }}>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--fg-0)", letterSpacing: "-0.02em", marginBottom: 6 }}>
                  Import your resume
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--fg-4)" }}>
                  Paste text or upload a file — AI will parse it into sections instantly
                </div>
              </div>

              <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Upload zone */}
                <label
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 10, padding: "28px 24px",
                    border: `2px dashed ${rawText ? "var(--accent)" : "var(--line)"}`,
                    borderRadius: 12, cursor: "pointer",
                    background: rawText ? "color-mix(in oklch, var(--accent) 4%, var(--bg-1))" : "var(--bg-1)",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                      const form = new FormData();
                      form.append("file", file);
                      const { token: authToken } = useAuthStore.getState();
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/extract-text`, {
                        method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: form,
                      });
                      if (res.ok) { const d = await res.json(); setRawText(d.text); markDirty(true); }
                      else alert("Could not extract PDF text. Try pasting the text instead.");
                    } else {
                      setRawText(await file.text()); markDirty(true);
                    }
                  }}
                >
                  <input type="file" accept=".txt,.pdf,.docx,text/plain" style={{ display: "none" }}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                        const form = new FormData();
                        form.append("file", file);
                        const { token: authToken } = useAuthStore.getState();
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/extract-text`, {
                          method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: form,
                        });
                        if (res.ok) { const d = await res.json(); setRawText(d.text); markDirty(true); }
                        else alert("Could not extract PDF text. Try pasting the text instead.");
                      } else {
                        setRawText(await file.text()); markDirty(true);
                      }
                      e.target.value = "";
                    }}
                  />
                  {rawText ? (
                    <>
                      <div style={{ fontSize: 28 }}>✓</div>
                      <div className="mono" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                        {rawText.split(/\s+/).filter(Boolean).length} words loaded
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>click to replace file</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 28, opacity: 0.4 }}>↑</div>
                      <div style={{ textAlign: "center" }}>
                        <div className="mono" style={{ fontSize: 12.5, color: "var(--fg-1)", fontWeight: 600 }}>Drop your resume here</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 3 }}>PDF, DOCX, or TXT · or click to browse</div>
                      </div>
                    </>
                  )}
                </label>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>or paste text</span>
                  <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                </div>

                {/* Paste textarea */}
                <div style={{
                  border: "1px solid var(--line)", borderRadius: 10,
                  background: "var(--bg-1)", overflow: "hidden",
                }}>
                  <textarea
                    value={rawText}
                    onChange={e => { setRawText(e.target.value); markDirty(true); }}
                    placeholder={"Paste your resume text here…\n\nThe AI will automatically detect and parse:\n  · Contact info  · Work experience\n  · Education      · Skills & certifications"}
                    style={{
                      width: "100%", height: 180,
                      fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7,
                      color: "var(--fg-1)", background: "transparent",
                      resize: "none", padding: "14px 16px",
                      outline: "none", border: "none",
                    }}
                  />
                  {rawText && (
                    <div style={{
                      borderTop: "1px solid var(--line-soft)", padding: "6px 14px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
                        {rawText.split(/\s+/).filter(Boolean).length} words · {rawText.length} chars
                      </span>
                      <button
                        onClick={() => { setRawText(""); markDirty(false); }}
                        className="mono"
                        style={{ fontSize: 10.5, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        clear ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  <button
                    onClick={() => handleAIRewrite()}
                    disabled={isCreating || !rawText}
                    className="btn btn-accent mono"
                    style={{ height: 38, fontSize: 13, padding: "0 22px", flex: 1, justifyContent: "center", opacity: !rawText ? 0.4 : 1 }}
                  >
                    <span style={{ fontSize: 14 }}>✦</span>
                    {isCreating ? "parsing resume…" : "parse & open with AI"}
                  </button>
                  <button
                    onClick={async () => {
                      const SAMPLE = `John Smith
john.smith@email.com | +1 (555) 123-4567 | San Francisco, CA
linkedin.com/in/johnsmith | github.com/johnsmith

SUMMARY
Software Engineer with 4+ years of experience building scalable web applications and APIs. Proficient in React, Node.js, Python, and cloud infrastructure. Passionate about developer tooling and great user experiences.

EXPERIENCE
Acme Corp — San Francisco, CA
Senior Software Engineer | Jan 2022 – Present
• Led migration of monolithic backend to microservices, reducing deployment time by 60%
• Built real-time dashboard used by 10,000+ daily active users using React and WebSockets
• Mentored 3 junior engineers and conducted weekly code reviews
• Improved API response times by 40% through query optimization and caching strategies

Startup XYZ — Remote
Software Engineer | Jun 2020 – Dec 2021
• Developed and shipped 5 major product features from design to production
• Integrated third-party payment and auth systems (Stripe, Auth0)
• Wrote comprehensive test suites, increasing code coverage from 45% to 85%

EDUCATION
University of California, Berkeley
B.S. Computer Science | 2020

SKILLS
Technical: JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Redis, Docker, AWS, Git
Soft: Leadership, Communication, Problem Solving, Agile

CERTIFICATIONS
AWS Certified Solutions Architect – Associate (2023)

PROJECTS
DevTools Dashboard — github.com/johnsmith/devtools
A developer productivity dashboard with CI/CD metrics, log streaming, and team insights. Built with Next.js, FastAPI, and PostgreSQL.`;
                      setRawText(SAMPLE);
                      await handleAIRewrite();
                    }}
                    className="btn btn-ghost mono"
                    style={{ height: 38, fontSize: 12, whiteSpace: "nowrap" }}
                  >
                    load sample
                  </button>
                </div>

                {/* Hint */}
                <div className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>
                  Your data stays private · processed securely on our servers
                </div>

              </div>
            </div>
          </main>
        ) : (
          <div style={{ position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Canvas
              resume={resume?.content ?? null}
              rawText={rawText}
              activeSection={activeSection}
              heatmap={heatmap}
              onToggleHeatmap={() => setHeatmap(v => !v)}
              aiState={aiState}
              ats={ats}
              onTextChange={text => { setRawText(text); markDirty(true); }}
              onSectionRewrite={handleSectionRewrite}
              requestGhost={requestGhost}
              resumeId={resumeId}
              resumeStyle={resumeStyle}
              template={template}
            />
            <FloatingActions
              onRunAI={() => handleAIRewrite()}
              onStopAI={() => { cancelAI(); setAIState("idle"); }}
              onExport={handleExport}
              onShare={resumeId ? handleShare : undefined}
              onHistory={() => setRailTab("versions")}
              aiState={aiState}
            />
          </div>
        )}

        <RightRail
          tab={railTab}
          setTab={setRailTab}
          aiState={aiState}
          aiError={aiError}
          activities={ai.activities}
          pendingResult={ai.pendingResult}
          reasoning={ai.reasoning}
          activeModel={ai.activeModel}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          onAcceptPatch={handleAcceptPatch}
          ats={ats}
          heatmap={heatmap}
          setHeatmap={setHeatmap}
          versions={versions}
          onRestoreVersion={handleRestoreVersion}
          onShowVersionDiff={resumeId ? () => setShowVersionDiff(true) : undefined}
          resumeId={resumeId}
          resume={resume?.content ?? null}
          jd={jd}
          onATSFix={handleATSFix}
          onExportPlainText={resume?.content ? () => exportATSPlainText(resume.content, resume.title ?? "resume") : undefined}
          resumeStyle={resumeStyle}
          onStyleChange={setResumeStyle}
        />
      </div>

      <StatusBar
        ats={ats}
        aiState={aiState}
        wordCount={wordCount}
        heatmap={heatmap}
        version={resume?.version ? `v${resume.version}` : undefined}
        errorCount={ats ? ats.checkpoints.filter(c => !c.passed).length : 0}
        resume={resume?.content ?? null}
      />

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onCommand={handleCommand}
        />
      )}

      {showTemplatePicker && resume?.content && (
        <TemplatePicker
          current={template}
          resume={resume.content}
          resumeStyle={resumeStyle}
          onSelect={(t) => { setTemplate(t); setPrinting(true); }}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {printing && resume?.content && (
        <PrintPreview
          resume={resume.content}
          title={resume.title}
          template={template}
          resumeStyle={resumeStyle}
          onClose={() => { setPrinting(false); setShowTemplatePicker(false); }}
        />
      )}

      {showShortcuts && (
        <ShortcutOverlay onClose={() => setShowShortcuts(false)} />
      )}

      {showVersionDiff && resumeId && (
        <VersionDiffViewer
          resumeId={resumeId}
          onClose={() => setShowVersionDiff(false)}
          onRestore={handleVersionRestore}
        />
      )}

      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={() => { localStorage.setItem("resume-agent-onboarded", "1"); setShowOnboarding(false); }}
        />
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return `${Math.round(diff / 86400000)}d ago`;
}
