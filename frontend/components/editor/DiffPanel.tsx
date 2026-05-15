"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";
import type { DiffPatch } from "@/types/resume";

export function DiffPanel() {
  const { ai, acceptAISuggestion, rejectAISuggestion, acceptPatch } = useResumeStore();
  const result = ai.pendingResult;

  if (!result) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="diff-panel"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col gap-4 h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">AI Suggestions</h3>
            <p className="text-xs text-slate-500 mt-0.5">{result.diff_patches.length} changes</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={rejectAISuggestion}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reject all
            </button>
            <button
              onClick={acceptAISuggestion}
              className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              Accept all
            </button>
          </div>
        </div>

        {/* Reasoning */}
        {ai.reasoning && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-violet-50 border border-violet-100 rounded-lg"
          >
            <p className="text-xs text-violet-700 leading-relaxed">{ai.reasoning}</p>
          </motion.div>
        )}

        {/* Diff patches */}
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {result.diff_patches.map((patch, i) => (
            <PatchCard key={i} patch={patch} onAccept={() => acceptPatch(patch)} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PatchCard({ patch, onAccept }: { patch: DiffPatch; onAccept: () => void }) {
  const label = patch.path.split(".").pop() ?? patch.path;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-200 rounded-lg overflow-hidden text-xs"
    >
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className="font-mono text-slate-500 truncate max-w-[200px]">{label}</span>
        <button
          onClick={onAccept}
          className="text-violet-600 hover:text-violet-800 font-medium ml-2 shrink-0"
        >
          Accept
        </button>
      </div>
      <div className="p-3 space-y-2">
        {patch.original && (
          <div className="bg-red-50 border border-red-100 rounded px-2 py-1.5">
            <span className="text-red-400 mr-1">−</span>
            <span className="text-red-700 line-through">{patch.original.slice(0, 120)}</span>
          </div>
        )}
        <div className="bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">
          <span className="text-emerald-400 mr-1">+</span>
          <span className="text-emerald-700">{patch.suggested.slice(0, 120)}</span>
        </div>
      </div>
    </motion.div>
  );
}
