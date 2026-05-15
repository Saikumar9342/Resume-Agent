"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";
import type { AIActivity } from "@/types/resume";

const NODE_CONFIG: Record<AIActivity["node"], { label: string; color: string; icon: string }> = {
  extraction: { label: "Parsing",     color: "text-blue-500",   icon: "◈" },
  analysis:   { label: "Analyzing",   color: "text-amber-500",  icon: "◎" },
  optimization:{ label: "Optimizing", color: "text-violet-500", icon: "◆" },
  validation: { label: "Validating",  color: "text-emerald-500",icon: "◉" },
};

const PIPELINE_NODES: AIActivity["node"][] = ["extraction", "analysis", "optimization", "validation"];

export function AIActivityFeed() {
  const { ai } = useResumeStore();
  const { isStreaming, activities } = ai;
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest activity
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activities.length]);

  if (!isStreaming && activities.length === 0) return null;

  const activeNode = activities.length > 0
    ? activities[activities.length - 1].node
    : "extraction";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-3xl mb-4"
    >
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 shadow-xl">
        {/* Pipeline progress bar */}
        <div className="flex border-b border-slate-700/50">
          {PIPELINE_NODES.map((node, i) => {
            const cfg = NODE_CONFIG[node];
            const nodeActivities = activities.filter((a) => a.node === node);
            const isActive = node === activeNode && isStreaming;
            const isDone = activities.some((a) => a.node === node) &&
              (PIPELINE_NODES.indexOf(activeNode) > i || !isStreaming);

            return (
              <div
                key={node}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 " + cfg.color
                    : isDone
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
              >
                {isActive ? (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    {cfg.icon}
                  </motion.span>
                ) : isDone ? (
                  <span className="text-emerald-500">✓</span>
                ) : (
                  <span>{cfg.icon}</span>
                )}
                <span className="hidden sm:inline">{cfg.label}</span>
                {nodeActivities.length > 0 && (
                  <span className="text-slate-600 hidden sm:inline">
                    ({nodeActivities.length})
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Activity messages */}
        <div className="p-4 space-y-2 max-h-40 overflow-y-auto font-mono">
          <AnimatePresence initial={false}>
            {activities.map((activity, i) => {
              const cfg = NODE_CONFIG[activity.node];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-2.5 text-xs"
                >
                  <span className={`${cfg.color} shrink-0 mt-0.5`}>{cfg.icon}</span>
                  <span className="text-slate-300 leading-relaxed">{activity.message}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Blinking cursor while streaming */}
          {isStreaming && (
            <motion.div
              className="flex items-center gap-2.5 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className={NODE_CONFIG[activeNode].color}>
                {NODE_CONFIG[activeNode].icon}
              </span>
              <motion.span
                className="text-slate-500"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                ▋
              </motion.span>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </motion.div>
  );
}
