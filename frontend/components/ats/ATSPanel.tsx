"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";

export function ATSPanel() {
  const { ats, resume } = useResumeStore();
  const score = ats?.score ?? resume?.ats_score ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-slate-900 text-sm">ATS Score</h3>

      {/* Score ring */}
      <div className="flex items-center gap-4">
        <ScoreRing score={score} />
        <div>
          <p className="text-2xl font-bold text-slate-900">{score !== null ? `${score}%` : "—"}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {score === null
              ? "Run analysis to score"
              : score >= 80
              ? "ATS Ready"
              : score >= 60
              ? "Needs improvement"
              : "Major issues"}
          </p>
        </div>
      </div>

      {/* Missing keywords */}
      {ats?.missing_keywords && ats.missing_keywords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Missing keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {ats.missing_keywords.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Checkpoints */}
      {ats?.checkpoints && (
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-slate-600 mb-1">Checkpoints</p>
          <AnimatePresence>
            {ats.checkpoints.map((cp, i) => (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-2 py-1"
              >
                <span className={`text-base ${cp.passed ? "text-emerald-500" : "text-red-400"}`}>
                  {cp.passed ? "✓" : "✗"}
                </span>
                <span className={`text-xs ${cp.passed ? "text-slate-600" : "text-red-600"}`}>
                  {cp.label}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Suggestions */}
      {ats?.suggestions && ats.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Suggestions</p>
          <ul className="space-y-1">
            {ats.suggestions.slice(0, 5).map((s, i) => (
              <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                <span className="text-amber-500 shrink-0">→</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? score / 100 : 0;
  const color = !score ? "#94a3b8" : score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="72" height="72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <motion.circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}
