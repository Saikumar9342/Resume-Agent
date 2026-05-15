"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getVersions, restoreVersion, type ResumeVersion } from "@/lib/db";
import { useResumeStore } from "@/store/resumeStore";

interface VersionHistoryProps {
  resumeId: string;
  onClose: () => void;
}

export function VersionHistory({ resumeId, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [restoring, setRestoring] = useState<number | null>(null);
  const { updateContent } = useResumeStore();

  useEffect(() => {
    getVersions(resumeId).then(setVersions);
  }, [resumeId]);

  const handleRestore = async (v: ResumeVersion) => {
    setRestoring(v.id!);
    updateContent(v.content);
    setTimeout(() => {
      setRestoring(null);
      onClose();
    }, 600);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;

    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Version History</h2>
              <p className="text-xs text-slate-500 mt-0.5">{versions.length} saved versions</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Versions list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {versions.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No saved versions yet
              </div>
            ) : (
              versions.map((v) => (
                <motion.div
                  key={v.id}
                  layout
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        v.label === "Before AI rewrite"
                          ? "bg-violet-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{v.label}</p>
                      <p className="text-xs text-slate-400">{formatTime(v.savedAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(v)}
                    disabled={restoring === v.id}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    {restoring === v.id ? (
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      >
                        Restoring…
                      </motion.span>
                    ) : (
                      "Restore"
                    )}
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
