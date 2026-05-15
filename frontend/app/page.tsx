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

  const { requestAI } = useResumeWebSocket(resumeId);
  const { saveBeforeAI } = useAutosave(resumeId);

  // Auto-open diff panel when AI result arrives
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
    await saveBeforeAI(); // snapshot before AI changes
    requestAI(rawText, jobDescription || undefined);
  };

  const handleATSAnalyze = async () => {
    if (!resumeId) return;
    setRightPanel("ats");
    const analysis = await api.analyzeATS(resumeId, jobDescription || undefined);
    useResumeStore.getState().setATS(analysis);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">R</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm">Resume Agent</span>
          {resume && <span className="text-slate-400 text-sm">/</span>}
          {resume && <span className="text-slate-600 text-sm">{resume.title}</span>}

          {/* Save status */}
          {resumeId && (
            <span className={`text-xs ml-1 ${editor.isDirty ? "text-amber-500" : "text-emerald-500"}`}>
              {editor.isDirty ? "● Saving…" : "✓ Saved"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {resumeId && (
            <button
              onClick={() => setShowVersionHistory(true)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              History
            </button>
          )}

          {!resumeId ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCreate}
              disabled={isCreating}
              className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? "Creating…" : "Start Resume"}
            </motion.button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAIRewrite}
                disabled={ai.isStreaming}
                className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {ai.isStreaming && (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                  />
                )}
                {ai.isStreaming ? "Rewriting…" : "AI Rewrite"}
              </motion.button>

              <button
                onClick={handleATSAnalyze}
                className="px-4 py-1.5 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                ATS Score
              </button>
            </>
          )}
        </div>
      </header>

      {/* Job description bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2">
        <input
          type="text"
          placeholder="Paste a job description or keywords to optimize for a specific role…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
        />
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <AIActivityFeed />
            <ResumeEditor onTextChange={handleTextChange} />
          </div>
        </main>

        {/* Right panel */}
        <AnimatePresence>
          {rightPanel && (
            <motion.aside
              key="right-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-l border-slate-200 bg-white overflow-y-auto overflow-x-hidden shrink-0"
            >
              <div className="p-5 min-w-[380px]">
                <div className="flex gap-1 mb-5 border-b border-slate-100 pb-3">
                  <PanelTab
                    label="AI Diff"
                    active={rightPanel === "diff"}
                    onClick={() => setRightPanel("diff")}
                    badge={ai.pendingResult?.diff_patches.length}
                  />
                  <PanelTab
                    label="ATS Score"
                    active={rightPanel === "ats"}
                    onClick={() => setRightPanel("ats")}
                  />
                  <button
                    onClick={() => setRightPanel(null)}
                    className="ml-auto text-slate-400 hover:text-slate-600 text-sm"
                  >
                    ✕
                  </button>
                </div>

                {rightPanel === "diff" && <DiffPanel />}
                {rightPanel === "ats" && <ATSPanel />}
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
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
        active
          ? "bg-violet-50 text-violet-700"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="bg-violet-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
          {badge}
        </span>
      )}
    </button>
  );
}
