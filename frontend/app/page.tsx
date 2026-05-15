"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";
import { useResumeWebSocket } from "@/hooks/useWebSocket";
import { useAutosave } from "@/hooks/useAutosave";
import { ResumeEditor } from "@/components/editor/ResumeEditor";
import { DiffPanel } from "@/components/editor/DiffPanel";
import { AIActivityFeed } from "@/components/editor/AIActivityFeed";
import { ATSPanel } from "@/components/ats/ATSPanel";
import { VersionHistory } from "@/components/editor/VersionHistory";
import { api } from "@/lib/api";

type RightPanel = "diff" | "ats" | null;

export default function HomePage() {
  const { resume, ai, editor, setResume, markDirty } = useResumeStore();
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [rawText, setRawText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [jdFocused, setJdFocused] = useState(false);

  const { requestAI } = useResumeWebSocket(resumeId);
  const { saveBeforeAI } = useAutosave(resumeId);

  useEffect(() => {
    if (ai.pendingResult) setRightPanel("diff");
  }, [ai.pendingResult]);

  const handleTextChange = useCallback(
    (text: string) => {
      setRawText(text);
      if (resumeId) markDirty(true);
    },
    [resumeId, markDirty]
  );

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const r = await api.createResume("My Resume", rawText || undefined);
      setResume(r);
      setResumeId(r.id);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAIRewrite = async () => {
    if (!resumeId || !rawText) return;
    await saveBeforeAI();
    requestAI(rawText, jobDescription || undefined);
  };

  const handleATSAnalyze = async () => {
    if (!resumeId) return;
    setRightPanel("ats");
    const analysis = await api.analyzeATS(resumeId, jobDescription || undefined);
    useResumeStore.getState().setATS(analysis);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8f9fc] overflow-hidden">

      {/* ── Top Navigation ── */}
      <header className="h-14 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between shrink-0 z-10">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-200">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3h10v2H3V3zM3 7h7v2H3V7zM3 11h5v2H3v-2z" fill="white" fillOpacity="0.9"/>
              <circle cx="12" cy="12" r="2.5" fill="white" fillOpacity="0.7"/>
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 text-sm tracking-tight">Resume Agent</span>
            {resume && (
              <>
                <span className="text-slate-300 text-sm">/</span>
                <span className="text-slate-500 text-sm">{resume.title}</span>
              </>
            )}
          </div>

          {/* Save pill */}
          <AnimatePresence>
            {resumeId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  editor.isDirty
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${editor.isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                {editor.isDirty ? "Saving…" : "Saved"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {resumeId && (
            <button
              onClick={() => setShowVersionHistory(true)}
              className="h-8 px-3 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1a5.5 5.5 0 100 11A5.5 5.5 0 006.5 1zm0 1a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm-.5 2v3.25l2.5 1.5-.5.75-3-1.75V4h1z" fill="currentColor"/>
              </svg>
              History
            </button>
          )}

          {!resumeId ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={isCreating}
              className="h-9 px-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-violet-200 hover:shadow-md hover:shadow-violet-200 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full inline-block"
                  />
                  Creating…
                </>
              ) : (
                <>
                  <span className="text-white/80">+</span>
                  Start Resume
                </>
              )}
            </motion.button>
          ) : (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleATSAnalyze}
                className="h-9 px-4 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <span className="text-base leading-none">📊</span>
                ATS Score
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAIRewrite}
                disabled={ai.isStreaming}
                className="h-9 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-violet-200 hover:shadow-md transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {ai.isStreaming ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full inline-block"
                    />
                    Rewriting…
                  </>
                ) : (
                  <>
                    <span className="text-base leading-none">✦</span>
                    AI Rewrite
                  </>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </header>

      {/* ── Job Description Bar ── */}
      <div className={`shrink-0 bg-white border-b transition-all duration-200 ${jdFocused ? "border-violet-200 shadow-sm shadow-violet-50" : "border-slate-200/80"}`}>
        <div className="px-5 py-2.5 flex items-center gap-3">
          <span className="text-slate-300 text-sm shrink-0">🎯</span>
          <input
            type="text"
            placeholder="Paste a job description or role keywords to tailor your resume…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            onFocus={() => setJdFocused(true)}
            onBlur={() => setJdFocused(false)}
            className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
          />
          {jobDescription && (
            <button
              onClick={() => setJobDescription("")}
              className="text-slate-300 hover:text-slate-500 text-xs transition-colors shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor area */}
        <main className="flex-1 overflow-y-auto">
          {/* Empty state */}
          {!resumeId && (
            <div className="h-full flex flex-col items-center justify-center gap-8 px-6 pb-16">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-md"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <span className="text-3xl">✦</span>
                </div>
                <h1 className="text-2xl font-semibold text-slate-800 mb-2 tracking-tight">
                  Build your perfect resume
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Paste your existing resume or start fresh. AI will help you optimize for ATS, improve your bullets, and tailor it to any role.
                </p>
              </motion.div>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="flex flex-wrap justify-center gap-2"
              >
                {[
                  { icon: "⚡", label: "Real-time AI suggestions" },
                  { icon: "📊", label: "ATS score analysis" },
                  { icon: "🔀", label: "Visual diff & track changes" },
                  { icon: "💾", label: "Auto-save & version history" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 shadow-sm">
                    <span>{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-2xl"
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <ResumeEditor onTextChange={handleTextChange} />
                </div>
                <div className="mt-4 flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="h-11 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-200 transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {isCreating ? "Creating…" : "✦  Start with AI"}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Active editor */}
          {resumeId && (
            <div className="p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                <AIActivityFeed />
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <ResumeEditor onTextChange={handleTextChange} />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Right Panel ── */}
        <AnimatePresence>
          {rightPanel && (
            <motion.aside
              key="right-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="shrink-0 border-l border-slate-200/80 bg-white overflow-hidden flex flex-col"
            >
              <div className="flex flex-col h-full min-w-[400px]">
                {/* Panel header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-1">
                    <PanelTab
                      label="AI Suggestions"
                      icon="✦"
                      active={rightPanel === "diff"}
                      onClick={() => setRightPanel("diff")}
                      badge={ai.pendingResult?.diff_patches.length}
                    />
                    <PanelTab
                      label="ATS Analysis"
                      icon="📊"
                      active={rightPanel === "ats"}
                      onClick={() => setRightPanel("ats")}
                      badge={
                        useResumeStore.getState().ats?.score !== undefined
                          ? undefined
                          : undefined
                      }
                    />
                    <button
                      onClick={() => setRightPanel(null)}
                      className="ml-auto w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {rightPanel === "diff" && <DiffPanel />}
                  {rightPanel === "ats" && <ATSPanel />}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Version history modal */}
      {showVersionHistory && resumeId && (
        <VersionHistory
          resumeId={resumeId}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}

function PanelTab({
  label,
  icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 ${
        active
          ? "bg-violet-50 text-violet-700 shadow-sm"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="text-sm leading-none">{icon}</span>
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="bg-violet-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}
