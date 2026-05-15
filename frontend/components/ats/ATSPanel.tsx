"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";

export function ATSPanel() {
  const { ats, resume } = useResumeStore();
  const score = ats?.score ?? resume?.ats_score ?? null;

  const scoreColor =
    score === null ? "#94a3b8"
    : score >= 80 ? "#10b981"
    : score >= 60 ? "#f59e0b"
    : "#ef4444";

  const scoreLabel =
    score === null ? "Not analyzed"
    : score >= 80 ? "ATS Ready ✓"
    : score >= 60 ? "Needs Work"
    : "Major Issues";

  if (!ats && score === null) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 text-2xl">📊</div>
        <p className="text-sm font-medium text-slate-500">No analysis yet</p>
        <p className="text-xs text-slate-400 mt-1">Click ATS Score to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Score hero */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 flex items-center gap-5">
        <div className="relative shrink-0">
          <ScoreRing score={score} color={scoreColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: scoreColor }}>
              {score !== null ? Math.round(score) : "–"}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">{score !== null ? `${Math.round(score)}%` : "–"}</p>
          <p className="text-sm font-medium mt-0.5" style={{ color: scoreColor }}>{scoreLabel}</p>
          <p className="text-xs text-slate-400 mt-1">
            {ats ? `${ats.checkpoints.filter(c => c.passed).length}/${ats.checkpoints.length} checks passed` : ""}
          </p>
        </div>
      </div>

      {/* Missing keywords */}
      {ats?.missing_keywords && ats.missing_keywords.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Missing Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {ats.missing_keywords.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-1 bg-amber-50 border border-amber-200/70 rounded-full text-xs font-medium text-amber-700"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Checkpoints */}
      {ats?.checkpoints && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">ATS Checkpoints</p>
          <div className="space-y-1">
            <AnimatePresence>
              {ats.checkpoints.map((cp, i) => (
                <motion.div
                  key={cp.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${
                    cp.passed ? "bg-emerald-50/60" : "bg-red-50/60"
                  }`}
                >
                  <span className={`shrink-0 font-bold ${cp.passed ? "text-emerald-500" : "text-red-400"}`}>
                    {cp.passed ? "✓" : "✗"}
                  </span>
                  <span className={cp.passed ? "text-slate-600" : "text-red-600"}>{cp.label}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {ats?.suggestions && ats.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Fix These</p>
          <div className="space-y-2">
            {ats.suggestions.slice(0, 6).map((s, i) => (
              <div key={i} className="flex gap-2.5 text-xs text-slate-600 bg-white border border-slate-100 rounded-lg px-3 py-2 shadow-sm">
                <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, color }: { score: number | null; color: string }) {
  const size = 72;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? score / 100 : 0;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}
