"use client";

import { useCallback, useEffect, useState } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { useResumeWebSocket } from "@/hooks/useWebSocket";
import { useAutosave } from "@/hooks/useAutosave";
import { api } from "@/lib/api";
import { getVersions, restoreVersion } from "@/lib/db";

import { Landing } from "@/components/landing/Landing";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuthStore } from "@/store/authStore";
import { TopBar } from "@/components/editor/TopBar";
import { JDBar } from "@/components/editor/JDBar";
import { SectionTree } from "@/components/editor/SectionTree";
import { Canvas } from "@/components/editor/Canvas";
import { RightRail } from "@/components/editor/RightRail";
import type { VersionEntry } from "@/components/editor/RightRail";
import { StatusBar } from "@/components/editor/StatusBar";
import { CommandPalette } from "@/components/editor/CommandPalette";
import type { DiffPatch } from "@/types/resume";

type Screen = "landing" | "editor";
type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "projects";
type RailTab = "ai" | "ats" | "versions";

export function ResumeApp() {
  const { resume, ai, editor, ats, setResume, markDirty, acceptAISuggestion, rejectAISuggestion, acceptPatch, setATS } = useResumeStore();
  const { isAuthenticated } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  const [screen, setScreen] = useState<Screen>("landing");
  const [resumeId, setResumeId] = useState<string | null>(null);
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

  const { requestAI, cancelAI } = useResumeWebSocket(resumeId, (msg) => {
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

  // Keyboard shortcuts
  useEffect(() => {
    if (screen !== "editor") return;
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); }
      else if (mod && e.key === "Enter") { e.preventDefault(); handleAIRewrite(); }
      else if (mod && e.key.toLowerCase() === "h") { e.preventDefault(); setHeatmap(v => !v); }
      else if (e.key === "Escape") setPaletteOpen(false);
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

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const r = await api.createResume("My Resume", rawText || undefined);
      setResume(r);
      setResumeId(r.id);
      setScreen("editor");
      markDirty(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBoot = () => {
    if (!isAuthenticated()) { setShowAuth(true); return; }
    setScreen("editor");
  };

  const handleAIRewrite = async () => {
    if (!resumeId && !rawText) return;
    if (!resumeId) { await handleCreate(); return; }
    setAIError(null);
    await saveBeforeAI();
    requestAI(rawText, jd || undefined);
    setRailTab("ai");
  };

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

  const handleExport = async () => {
    if (!resumeId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/resumes/${resumeId}/export`;
    window.open(url, "_blank");
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
  };

  const handleRejectAll = () => {
    rejectAISuggestion();
    setAIState("idle");
  };

  const handleAcceptPatch = (patch: DiffPatch) => {
    acceptPatch(patch);
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

  const wordCount = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;

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
        onPalette={() => setPaletteOpen(true)}
        onRunAI={handleAIRewrite}
        onStopAI={() => { cancelAI(); setAIState("idle"); }}
        onHistory={() => setRailTab("versions")}
        onExport={handleExport}
        onBack={() => setScreen("landing")}
        aiState={aiState}
        isDirty={editor.isDirty}
      />

      <JDBar
        jd={jd}
        setJD={setJD}
        matchedKeywords={ats ? ats.checkpoints.filter(c => c.passed).length : 0}
        missingKeywords={ats ? ats.missing_keywords.length : 0}
      />

      {/* 3-pane */}
      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr) 400px", minHeight: 0, overflow: "hidden" }}>
        <SectionTree
          resume={resume?.content ?? null}
          active={activeSection}
          onSelect={setActiveSection}
          heatmap={heatmap}
        />

        {!resumeId ? (
          /* Pre-create: raw text entry */
          <main style={{
            background: "var(--bg-0)",
            display: "flex", flexDirection: "column",
            minHeight: 0, borderRight: "1px solid var(--line)",
          }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 36px" }}>
              <div style={{
                width: 760, maxWidth: "100%",
                background: "var(--bg-1)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "48px 56px",
                boxShadow: "0 40px 60px -30px black",
              }}>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  paste your resume · or start typing
                </div>
                <textarea
                  value={rawText}
                  onChange={e => { setRawText(e.target.value); markDirty(true); }}
                  placeholder="Paste your resume here to get started. The AI will parse it into sections automatically."
                  style={{
                    width: "100%", minHeight: 400,
                    fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6,
                    color: "var(--fg-1)", background: "transparent",
                    resize: "vertical",
                  }}
                />
                <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                  <button
                    onClick={handleCreate}
                    disabled={isCreating || !rawText}
                    className="btn btn-accent mono"
                    style={{ height: 34, fontSize: 12, padding: "0 16px" }}
                  >
                    {isCreating ? "creating…" : "start with AI →"}
                  </button>
                  <button
                    onClick={() => { setResumeId("demo"); setScreen("editor"); }}
                    className="btn btn-ghost mono"
                    style={{ height: 34, fontSize: 12 }}
                  >
                    load sample
                  </button>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <Canvas
            resume={resume?.content ?? null}
            rawText={rawText}
            activeSection={activeSection}
            heatmap={heatmap}
            onToggleHeatmap={() => setHeatmap(v => !v)}
            aiState={aiState}
            ats={ats}
            onTextChange={text => { setRawText(text); markDirty(true); }}
          />
        )}

        <RightRail
          tab={railTab}
          setTab={setRailTab}
          aiState={aiState}
          aiError={aiError}
          activities={ai.activities}
          pendingResult={ai.pendingResult}
          reasoning={ai.reasoning}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          onAcceptPatch={handleAcceptPatch}
          ats={ats}
          heatmap={heatmap}
          setHeatmap={setHeatmap}
          versions={versions}
          onRestoreVersion={handleRestoreVersion}
        />
      </div>

      <StatusBar
        ats={ats}
        aiState={aiState}
        wordCount={wordCount}
        heatmap={heatmap}
        version={resume?.version ? `v${resume.version}` : undefined}
      />

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onCommand={handleCommand}
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
