"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";
import type { DiffPatch } from "@/types/resume";

export function DiffPanel() {
  const { ai, acceptAISuggestion, rejectAISuggestion, acceptPatch } = useResumeStore();
  const result = ai.pendingResult;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
          <span className="text-2xl">✦</span>
        </div>
        <p className="text-sm font-medium text-slate-500">No suggestions yet</p>
        <p className="text-xs text-slate-400 mt-1">Click AI Rewrite to get started</p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="diff-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-5"
      >
        {/* Reasoning card */}
        {ai.reasoning && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-violet-500">✦</span>
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">AI Reasoning</span>
            </div>
            <p className="text-sm text-violet-800 leading-relaxed">{ai.reasoning}</p>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={rejectAISuggestion}
            className="flex-1 h-9 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            Reject all
          </button>
          <button
            onClick={acceptAISuggestion}
            className="flex-1 h-9 text-xs font-medium rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-md hover:shadow-violet-200 transition-all"
          >
            Accept all ({result.diff_patches.length})
          </button>
        </div>

        {/* Patches */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Changes · {result.diff_patches.length}
          </p>
          {result.diff_patches.map((patch, i) => (
            <PatchCard key={i} patch={patch} index={i} onAccept={() => acceptPatch(patch)} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PatchCard({ patch, index, onAccept }: { patch: DiffPatch; index: number; onAccept: () => void }) {
  const label = patch.path.split(".").filter(Boolean).pop() ?? patch.path;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${patch.type === "added" ? "bg-emerald-400" : "bg-violet-400"}`} />
          <span className="text-xs font-medium text-slate-500 font-mono">{label}</span>
        </div>
        <button
          onClick={onAccept}
          className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        >
          Accept →
        </button>
      </div>

      {/* Diff content */}
      <div className="p-3 space-y-2 text-xs">
        {patch.original && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <span className="text-red-400 font-mono mr-1.5">−</span>
            <span className="text-red-600 line-through">{patch.original.slice(0, 140)}</span>
          </div>
        )}
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <span className="text-emerald-400 font-mono mr-1.5">+</span>
          <span className="text-emerald-700">{patch.suggested.slice(0, 140)}</span>
        </div>
      </div>
    </motion.div>
  );
}
