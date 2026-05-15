"use client";

import { useRef, useEffect } from "react";
import { Icon, Dot } from "@/components/ui/Icon";
import type { ATSAnalysis, AIActivity, AIRewriteResult, DiffPatch } from "@/types/resume";

type RailTab = "ai" | "ats" | "versions";

interface RightRailProps {
  tab: RailTab;
  setTab: (t: RailTab) => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  activities: AIActivity[];
  pendingResult: AIRewriteResult | null;
  reasoning: string;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptPatch: (patch: DiffPatch) => void;
  ats: ATSAnalysis | null;
  heatmap: boolean;
  setHeatmap: (v: boolean) => void;
  versions: VersionEntry[];
  onRestoreVersion: (id: string) => void;
}

export interface VersionEntry {
  id: string;
  label: string;
  note: string;
  time: string;
  score?: number;
  current?: boolean;
}

export function RightRail({
  tab, setTab, aiState, activities, pendingResult, reasoning,
  onAcceptAll, onRejectAll, onAcceptPatch,
  ats, heatmap, setHeatmap,
  versions, onRestoreVersion,
}: RightRailProps) {
  const diffCount = pendingResult?.diff_patches.length ?? 0;
  const atsScore = ats?.score ?? null;

  return (
    <aside style={{
      background: "var(--bg-1)",
      display: "flex", flexDirection: "column",
      minHeight: 0, overflow: "hidden",
    }}>
      {/* Tab strip */}
      <div style={{
        height: 34, display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-0)",
        flexShrink: 0,
      }}>
        <RailTabBtn id="ai" current={tab} setTab={setTab} icon="terminal" label="ai"
          badge={aiState === "review" ? diffCount : null} />
        <RailTabBtn id="ats" current={tab} setTab={setTab} icon="target" label="ats"
          badge={atsScore !== null ? (atsScore >= 80 ? "OK" : "!") : null} />
        <RailTabBtn id="versions" current={tab} setTab={setTab} icon="branch" label="versions" />
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" style={{ width: 28, height: 28, justifyContent: "center", padding: 0, marginRight: 6 }}>
          <Icon name="settings" size={13} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "ai" && (
          <AITerminal
            aiState={aiState}
            activities={activities}
            pendingResult={pendingResult}
            reasoning={reasoning}
            onAcceptAll={onAcceptAll}
            onRejectAll={onRejectAll}
            onAcceptPatch={onAcceptPatch}
          />
        )}
        {tab === "ats" && <ATSPane ats={ats} heatmap={heatmap} setHeatmap={setHeatmap} />}
        {tab === "versions" && <VersionsPane versions={versions} onRestore={onRestoreVersion} />}
      </div>
    </aside>
  );
}

function RailTabBtn({ id, current, setTab, icon, label, badge }: {
  id: RailTab; current: RailTab; setTab: (t: RailTab) => void;
  icon: string; label: string; badge?: number | string | null;
}) {
  const active = current === id;
  return (
    <button
      onClick={() => setTab(id)}
      className="mono"
      style={{
        position: "relative",
        height: 34,
        padding: "0 14px",
        display: "flex", alignItems: "center", gap: 7,
        background: "transparent",
        color: active ? "var(--fg-0)" : "var(--fg-2)",
        fontSize: 12,
        cursor: "pointer",
        border: 0,
      }}
    >
      {active && (
        <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 1, background: "var(--accent)" }} />
      )}
      <Icon name={icon} size={12} />
      {label}
      {badge != null && (
        <span className="mono" style={{
          padding: "0 5px", height: 14, lineHeight: "14px",
          fontSize: 9.5, fontWeight: 700,
          borderRadius: 99,
          background: typeof badge === "number" ? "var(--accent)" : (badge === "OK" ? "var(--green-soft)" : "var(--red-soft)"),
          color: typeof badge === "number" ? "var(--bg-0)" : (badge === "OK" ? "var(--green)" : "var(--red)"),
        }}>{badge}</span>
      )}
    </button>
  );
}

/* ── AI Terminal ── */
function AITerminal({ aiState, activities, pendingResult, reasoning, onAcceptAll, onRejectAll, onAcceptPatch }: {
  aiState: "idle" | "streaming" | "review" | "accepted";
  activities: AIActivity[];
  pendingResult: AIRewriteResult | null;
  reasoning: string;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptPatch: (patch: DiffPatch) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const showLog = aiState === "streaming" || aiState === "review" || aiState === "accepted";
  const showDiffs = aiState === "review" && pendingResult;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activities.length]);

  const nodeColorMap: Record<string, string> = {
    extraction: "var(--blue)",
    analysis: "var(--amber)",
    optimization: "var(--accent)",
    validation: "var(--green)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* terminal header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 8 }}>
          <Dot tone={aiState === "streaming" ? "accent" : aiState === "review" ? "amber" : "green"} />
          <span>agent · {aiState === "streaming" ? "running" : aiState === "review" ? "awaiting review" : aiState === "accepted" ? "applied" : "idle"}</span>
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
          gemini-2.0-flash · 4 nodes
        </div>
      </div>

      {/* Pipeline progress */}
      <PipelineBar activities={activities} aiState={aiState} />

      {/* Log area */}
      {showLog ? (
        <div style={{
          background: "var(--bg-0)",
          padding: "12px 14px",
          flex: showDiffs ? "0 0 auto" : "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          borderBottom: showDiffs ? "1px solid var(--line)" : "0",
          maxHeight: showDiffs ? 200 : "none",
        }} className="mono">
          {activities.map((a, i) => (
            <div key={i} className="line-in" style={{ display: "flex", gap: 8, fontSize: 11.5, lineHeight: 1.7 }}>
              <span style={{ color: "var(--fg-4)", width: 12 }}>›</span>
              <span style={{ color: nodeColorMap[a.node] || "var(--fg-2)", width: 80, flexShrink: 0 }}>[{a.node}]</span>
              <span style={{ color: "var(--fg-1)", flex: 1, wordBreak: "break-word" }}>{a.message}</span>
            </div>
          ))}
          {aiState === "streaming" && (
            <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--fg-3)" }}>
              <span style={{ color: "var(--accent)" }}>›</span>
              <span className="caret" style={{ background: "var(--fg-2)", width: 7, height: 12, display: "inline-block" }} />
            </div>
          )}
          {aiState !== "streaming" && activities.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line)", color: "var(--accent)", fontSize: 11, display: "flex", justifyContent: "space-between" }}>
              <span>{aiState === "accepted" ? "✓ patches applied" : "↳ review patches below"}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <EmptyState
          icon="terminal"
          title="Idle"
          msg="Press ⌘↵ or click rewrite to run the agent. Output streams in as patches you can accept individually."
        />
      )}

      {/* Diffs */}
      {showDiffs && (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <div style={{
            padding: "12px 14px 10px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-1)",
            position: "sticky", top: 0, zIndex: 1,
            flexShrink: 0,
          }}>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {pendingResult.diff_patches.length} patches
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={onRejectAll} className="btn btn-ghost mono" style={{ fontSize: 11, height: 24 }}>reject</button>
              <button onClick={onAcceptAll} className="btn btn-accent mono" style={{ fontSize: 11, height: 24 }}>
                accept all ({pendingResult.diff_patches.length})
              </button>
            </div>
          </div>
          <div style={{ padding: "10px 12px 16px" }}>
            {reasoning && (
              <div style={{
                background: "color-mix(in oklch, var(--accent) 8%, var(--bg-1))",
                border: "1px solid var(--accent-line)",
                borderRadius: 8, padding: "10px 12px",
                marginBottom: 10,
              }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, display: "flex", gap: 6, alignItems: "center" }}>
                  <Icon name="sparkle" size={10} /> agent rationale
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-0)" }}>{reasoning}</div>
              </div>
            )}
            {pendingResult.diff_patches.map((patch, i) => (
              <DiffCard key={i} patch={patch} index={i} onAccept={() => onAcceptPatch(patch)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineBar({ activities, aiState }: { activities: AIActivity[]; aiState: string }) {
  const nodes: Array<AIActivity["node"]> = ["extraction", "analysis", "optimization", "validation"];
  const done = aiState === "review" || aiState === "accepted";

  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
      {nodes.map((n, i) => {
        const seen = activities.filter(a => a.node === n).length;
        const current = aiState === "streaming" && seen > 0;
        const finished = done || (aiState !== "streaming" && seen > 0);
        return (
          <div key={n} style={{
            flex: 1, padding: "8px 10px",
            borderRight: i < nodes.length - 1 ? "1px solid var(--line-soft)" : "0",
            background: current ? "color-mix(in oklch, var(--accent) 8%, var(--bg-1))" : "var(--bg-1)",
          }}>
            <div className="mono" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: current ? "var(--accent)" : finished ? "var(--green)" : "var(--fg-3)" }}>
              {finished && !current
                ? <Icon name="check" size={10} />
                : current
                ? <span className="caret" style={{ width: 5, height: 5, background: "currentColor", display: "inline-block", borderRadius: 1 }} />
                : <Icon name="dot" size={8} />}
              {n.slice(0, 5)}
            </div>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--fg-4)", marginTop: 2 }}>
              {seen > 0 ? `${seen} msg` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DiffCard({ patch, index, onAccept }: { patch: DiffPatch; index: number; onAccept: () => void }) {
  const label = patch.path.split(".").filter(Boolean).pop() ?? patch.path;
  return (
    <div style={{
      border: "1px solid var(--line)",
      borderRadius: 8,
      background: "var(--bg-0)",
      marginBottom: 8,
      overflow: "hidden",
    }}>
      <div className="mono" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 11px",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--line)",
        fontSize: 10.5,
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--fg-4)" }}>{String(index + 1).padStart(2, "0")}</span>
          <span style={{ color: "var(--accent)" }}>{patch.path}</span>
          <span style={{ color: "var(--fg-3)" }}>· {label}</span>
        </div>
        <button onClick={onAccept} className="mono" style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: 11, cursor: "pointer" }}>
          accept →
        </button>
      </div>
      <div style={{ padding: "10px 11px", fontSize: 12.5, lineHeight: 1.55 }}>
        {patch.original && (
          <div style={{
            background: "color-mix(in oklch, var(--red) 8%, transparent)",
            borderLeft: "2px solid var(--red)",
            padding: "5px 9px", marginBottom: 4, borderRadius: 3, display: "flex", gap: 8,
          }}>
            <span className="mono" style={{ color: "var(--red)", fontWeight: 700, flexShrink: 0 }}>−</span>
            <span style={{ color: "var(--fg-0)" }}>{patch.original.slice(0, 160)}</span>
          </div>
        )}
        <div style={{
          background: "color-mix(in oklch, var(--green) 8%, transparent)",
          borderLeft: "2px solid var(--green)",
          padding: "5px 9px", borderRadius: 3, display: "flex", gap: 8,
        }}>
          <span className="mono" style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>+</span>
          <span style={{ color: "var(--fg-0)" }}>{patch.suggested.slice(0, 160)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── ATS Pane ── */
function ATSPane({ ats, heatmap, setHeatmap }: { ats: ATSAnalysis | null; heatmap: boolean; setHeatmap: (v: boolean) => void }) {
  if (!ats) {
    return (
      <EmptyState
        icon="target"
        title="No analysis"
        msg="Click ATS Score or run a rewrite to analyze your resume against the job description."
      />
    );
  }
  const isReady = ats.score >= 80;
  return (
    <div style={{ overflow: "auto", flex: 1 }}>
      {/* score hero */}
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ATSScoreRing score={ats.score} />
          <div>
            <div style={{ fontSize: 36, letterSpacing: "-0.04em", fontWeight: 500, lineHeight: 1, color: isReady ? "var(--green)" : "var(--amber)" }}>
              {ats.score}<span style={{ fontSize: 16, color: "var(--fg-3)" }}> / 100</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: isReady ? "var(--green)" : "var(--amber)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {isReady ? "✓ ATS ready" : "● needs work"}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
              {ats.checkpoints.filter(c => c.passed).length}/{ats.checkpoints.length} checks pass
            </div>
          </div>
        </div>
        <button
          onClick={() => setHeatmap(!heatmap)}
          className="btn mono"
          style={{
            marginTop: 14, width: "100%", justifyContent: "center",
            background: heatmap ? "var(--accent-soft)" : "var(--bg-2)",
            color: heatmap ? "var(--accent)" : "var(--fg-1)",
            borderColor: heatmap ? "var(--accent-line)" : "var(--line)",
            height: 30, fontSize: 12,
          }}
        >
          <Icon name="flame" size={12} />
          {heatmap ? "hide heatmap" : "show heatmap on resume"}
          <span className="kbd">⌘H</span>
        </button>
      </div>

      {/* missing keywords */}
      {ats.missing_keywords.length > 0 && (
        <div style={{ padding: "16px", borderBottom: "1px solid var(--line)" }}>
          <SectionLabel>missing keywords</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {ats.missing_keywords.map(k => (
              <span key={k} className="mono" style={{
                fontSize: 11, padding: "3px 8px",
                background: "var(--amber-soft)",
                border: "1px dashed color-mix(in oklch, var(--amber) 40%, transparent)",
                color: "var(--amber)",
                borderRadius: 4,
              }}>{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* checkpoints */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--line)" }}>
        <SectionLabel>checkpoints</SectionLabel>
        <div style={{ marginTop: 8 }}>
          {ats.checkpoints.map((cp, i) => (
            <div key={cp.id} className="mono" style={{
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 12, padding: "6px 8px", borderRadius: 4,
              color: "var(--fg-1)",
              background: i % 2 === 0 ? "transparent" : "color-mix(in oklch, var(--bg-2) 50%, transparent)",
            }}>
              <span style={{ color: cp.passed ? "var(--green)" : "var(--red)", width: 14, display: "inline-flex", justifyContent: "center" }}>
                {cp.passed ? <Icon name="check" size={11} /> : <Icon name="x" size={11} />}
              </span>
              <span style={{ flex: 1 }}>{cp.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* suggestions */}
      {ats.suggestions.length > 0 && (
        <div style={{ padding: "16px" }}>
          <SectionLabel>fixes ({ats.suggestions.length})</SectionLabel>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {ats.suggestions.slice(0, 6).map((f, i) => (
              <div key={i} style={{
                display: "flex", gap: 8, fontSize: 12, lineHeight: 1.5,
                padding: "8px 10px",
                background: "var(--bg-0)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                color: "var(--fg-1)",
              }}>
                <span className="mono" style={{ color: "var(--accent)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ATSScoreRing({ score }: { score: number }) {
  const size = 76, r = 32;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 100));
  const color = score >= 80 ? "var(--green)" : score >= 60 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 300ms ease" }}
        />
      </svg>
      <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 11, color: "var(--fg-3)" }}>ats</div>
    </div>
  );
}

/* ── Versions Pane ── */
function VersionsPane({ versions, onRestore }: { versions: VersionEntry[]; onRestore: (id: string) => void }) {
  if (versions.length === 0) {
    return (
      <EmptyState
        icon="branch"
        title="No versions yet"
        msg="Every AI rewrite or manual save creates a snapshot you can restore later."
      />
    );
  }
  return (
    <div style={{ overflow: "auto", flex: 1 }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
        <SectionLabel>git log · resume</SectionLabel>
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
          Every accept creates a snapshot. Restore inline.
        </div>
      </div>
      <div style={{ padding: "8px 8px 16px" }}>
        {versions.map((v, i) => (
          <div key={v.id} style={{ display: "flex", gap: 12, position: "relative", padding: "10px 8px" }}>
            <div style={{ position: "relative", width: 14, display: "flex", justifyContent: "center" }}>
              {i < versions.length - 1 && (
                <span style={{ position: "absolute", top: 14, bottom: -10, width: 1, background: "var(--line)" }} />
              )}
              <span style={{
                width: 10, height: 10, borderRadius: 99, marginTop: 5,
                background: v.current ? "var(--accent)" : "var(--bg-3)",
                border: v.current ? "0" : "1px solid var(--line)",
                boxShadow: v.current ? "0 0 0 3px var(--accent-soft)" : "none",
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span className="mono" style={{ color: v.current ? "var(--accent)" : "var(--fg-0)", fontSize: 12 }}>{v.label}</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{v.time}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-1)", marginTop: 2 }}>{v.note}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                {v.score != null && (
                  <span className="mono" style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 99,
                    background: v.score >= 80 ? "var(--green-soft)" : v.score >= 60 ? "var(--amber-soft)" : "var(--red-soft)",
                    color: v.score >= 80 ? "var(--green)" : v.score >= 60 ? "var(--amber)" : "var(--red)",
                  }}>ats {v.score}</span>
                )}
                {!v.current && (
                  <button
                    onClick={() => onRestore(v.id)}
                    className="mono"
                    style={{ background: "transparent", border: 0, fontSize: 11, color: "var(--fg-2)", cursor: "pointer", padding: 0 }}
                  >
                    restore
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, msg }: { icon: string; title: string; msg: string }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 40, textAlign: "center", color: "var(--fg-3)",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: "var(--bg-2)", border: "1px solid var(--line)",
        display: "grid", placeItems: "center", marginBottom: 14,
        color: "var(--fg-2)",
      }}>
        <Icon name={icon} size={18} />
      </div>
      <div className="mono" style={{ fontSize: 12, color: "var(--fg-1)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 280 }}>{msg}</div>
    </div>
  );
}
