"use client";

import { useRef, useEffect } from "react";
import { Icon, Dot } from "@/components/ui/Icon";
import type { ATSAnalysis, ATSCategoryScore, ATSCheckpoint, AIActivity, AIRewriteResult, DiffPatch, ResumeContent, ResumeStyle } from "@/types/resume";
import { CoverLetterPane } from "./CoverLetterPane";
import { InterviewPrepPane } from "./InterviewPrepPane";
import { StylePane } from "./StylePane";

type RailTab = "ai" | "ats" | "versions" | "cover" | "interview" | "style";

interface RightRailProps {
  tab: RailTab;
  setTab: (t: RailTab) => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  aiError: string | null;
  activities: AIActivity[];
  pendingResult: AIRewriteResult | null;
  reasoning: string;
  activeModel: string | null;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptPatch: (patch: DiffPatch) => void;
  ats: ATSAnalysis | null;
  heatmap: boolean;
  setHeatmap: (v: boolean) => void;
  versions: VersionEntry[];
  onRestoreVersion: (id: string) => void;
  resumeId: string | null;
  resume: ResumeContent | null;
  jd: string;
  onATSFix?: () => void;
  onShowVersionDiff?: () => void;
  onExportPlainText?: () => void;
  resumeStyle?: ResumeStyle;
  onStyleChange?: (s: ResumeStyle) => void;
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
  tab, setTab, aiState, aiError, activities, pendingResult, reasoning, activeModel,
  onAcceptAll, onRejectAll, onAcceptPatch,
  ats, heatmap, setHeatmap,
  versions, onRestoreVersion, onShowVersionDiff,
  resumeId, resume, jd,
  onATSFix, onExportPlainText,
  resumeStyle, onStyleChange,
}: RightRailProps) {
  const diffCount = pendingResult?.diff_patches.length ?? 0;
  const atsScore = ats?.score ?? null;

  return (
    <aside style={{
      background: "var(--bg-1)",
      display: "flex", flexDirection: "column",
      minHeight: 0, overflow: "hidden",
    }}>
      {/* Tab strip — scrollable so all 6 tabs fit regardless of rail width */}
      <div style={{
        height: 34, display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-0)",
        flexShrink: 0,
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
      }}>
        <RailTabBtn id="ai" current={tab} setTab={setTab} label="ai"
          badge={aiState === "review" ? diffCount : null} />
        <RailTabBtn id="ats" current={tab} setTab={setTab} label="ats"
          badge={atsScore !== null ? (atsScore >= 80 ? "OK" : "!") : null} />
        <RailTabBtn id="versions" current={tab} setTab={setTab} label="hist" />
        <RailTabBtn id="cover" current={tab} setTab={setTab} label="cover" />
        <RailTabBtn id="interview" current={tab} setTab={setTab} label="prep" />
        <RailTabBtn id="style" current={tab} setTab={setTab} label="style" />
        <div style={{ flex: 1, minWidth: 4 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "ai" && (
          <AITerminal
            aiState={aiState}
            aiError={aiError}
            activities={activities}
            pendingResult={pendingResult}
            reasoning={reasoning}
            activeModel={activeModel}
            onAcceptAll={onAcceptAll}
            onRejectAll={onRejectAll}
            onAcceptPatch={onAcceptPatch}
          />
        )}
        {tab === "ats" && <ATSPane ats={ats} heatmap={heatmap} setHeatmap={setHeatmap} onFix={onATSFix} aiState={aiState} onExportPlainText={onExportPlainText} />}
        {tab === "versions" && <VersionsPane versions={versions} onRestore={onRestoreVersion} onShowDiff={onShowVersionDiff} />}
        {tab === "cover" && <CoverLetterPane resumeId={resumeId} resume={resume} jd={jd} />}
        {tab === "interview" && <InterviewPrepPane resumeId={resumeId} resume={resume} jd={jd} />}
        {tab === "style" && (
          resumeStyle && onStyleChange
            ? <StylePane style={resumeStyle} onChange={onStyleChange} resumeRole={resume?.experience?.[0]?.title ?? resume?.contact?.name ?? ""} />
            : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-4)", fontSize: 12 }} className="mono">open a resume first</div>
        )}
      </div>
    </aside>
  );
}

function RailTabBtn({ id, current, setTab, label, badge }: {
  id: RailTab; current: RailTab; setTab: (t: RailTab) => void;
  label: string; badge?: number | string | null;
}) {
  const active = current === id;
  return (
    <button
      onClick={() => setTab(id)}
      className="mono"
      style={{
        position: "relative",
        height: 34,
        padding: "0 11px",
        display: "flex", alignItems: "center", gap: 5,
        background: "transparent",
        color: active ? "var(--fg-0)" : "var(--fg-3)",
        fontSize: 11,
        cursor: "pointer",
        border: 0,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {active && (
        <span style={{ position: "absolute", left: 6, right: 6, bottom: -1, height: 2, background: "var(--accent)", borderRadius: "1px 1px 0 0" }} />
      )}
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
function AITerminal({ aiState, aiError, activities, pendingResult, reasoning, activeModel, onAcceptAll, onRejectAll, onAcceptPatch }: {
  aiState: "idle" | "streaming" | "review" | "accepted";
  aiError: string | null;
  activities: AIActivity[];
  pendingResult: AIRewriteResult | null;
  reasoning: string;
  activeModel: string | null;
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

  const statusLabel = aiState === "streaming" ? "running" : aiState === "review" ? "awaiting review" : aiState === "accepted" ? "done" : "idle";
  const statusDot: "accent" | "amber" | "green" = aiState === "streaming" ? "accent" : aiState === "review" ? "amber" : "green";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Header */}
      <div style={{
        padding: "10px 14px 9px",
        borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot tone={statusDot} />
          <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-1)", fontWeight: 600 }}>AI Agent</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>· {statusLabel}</span>
        </div>
        {activeModel && (
          <span className="mono" style={{
            fontSize: 9.5, color: "var(--fg-4)",
            background: "var(--bg-3)", padding: "2px 7px", borderRadius: 4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
          }}>
            {activeModel.replace("claude-", "").replace(/-\d{8,}/, "")}
          </span>
        )}
      </div>

      {/* Pipeline steps */}
      <PipelineBar activities={activities} aiState={aiState} />

      {/* Error */}
      {aiError && (
        <div style={{
          margin: "10px 12px", padding: "10px 14px", flexShrink: 0,
          background: "color-mix(in oklch, var(--red) 8%, var(--bg-0))",
          border: "1px solid color-mix(in oklch, var(--red) 25%, transparent)",
          borderRadius: 8,
        }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>✕ error</div>
          <div style={{ fontSize: 12, color: "var(--fg-1)", lineHeight: 1.5 }}>
            {aiError.includes("RESOURCE_EXHAUSTED") || aiError.includes("quota")
              ? "API quota exhausted — check your provider key in backend/.env"
              : aiError.includes("API_KEY") || aiError.includes("invalid")
              ? "Invalid API key — check backend/.env"
              : aiError}
          </div>
        </div>
      )}

      {/* Log */}
      {showLog ? (
        <div style={{
          background: "var(--bg-0)",
          padding: "10px 12px",
          flex: showDiffs ? "0 0 auto" : "1 1 auto",
          minHeight: 0, overflow: "auto",
          borderBottom: showDiffs ? "1px solid var(--line)" : "none",
          maxHeight: showDiffs ? 210 : "none",
        }}>
          {activities.map((a, i) => (
            <div key={i} className="line-in mono" style={{ display: "flex", gap: 0, fontSize: 11.5, lineHeight: 1.65, marginBottom: 1 }}>
              {/* Node badge */}
              <span style={{
                flexShrink: 0, marginRight: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                color: nodeColorMap[a.node] || "var(--fg-2)",
                background: `color-mix(in oklch, ${nodeColorMap[a.node] || "var(--fg-2)"} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${nodeColorMap[a.node] || "var(--fg-2)"} 25%, transparent)`,
                borderRadius: 4, padding: "1px 6px",
                alignSelf: "flex-start", marginTop: 2,
                whiteSpace: "nowrap",
              }}>
                {a.node}
              </span>
              <span style={{ color: "var(--fg-1)", flex: 1, wordBreak: "break-word" }}>{a.message}</span>
            </div>
          ))}
          {aiState === "streaming" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span className="caret" style={{ background: "var(--accent)", width: 6, height: 13, display: "inline-block", borderRadius: 1 }} />
            </div>
          )}
          {aiState !== "streaming" && activities.length > 0 && (
            <div className="mono" style={{
              marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line)",
              fontSize: 11, color: aiState === "accepted" ? "var(--green)" : "var(--accent)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {aiState === "accepted" ? <Icon name="check" size={11} /> : <Icon name="sparkle" size={11} />}
              {aiState === "accepted" ? "patches applied" : "review patches below"}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <EmptyState
          icon="terminal"
          title="Idle"
          msg="Press Ctrl+Enter or click rewrite to run the agent. Output streams here as patches you can review individually."
        />
      )}

      {/* Diffs */}
      {showDiffs && (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {/* Sticky toolbar */}
          <div style={{
            padding: "8px 12px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-1)",
            position: "sticky", top: 0, zIndex: 1,
          }}>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
              {pendingResult.diff_patches.length} patch{pendingResult.diff_patches.length !== 1 ? "es" : ""} to review
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={onRejectAll} className="btn btn-ghost mono" style={{ fontSize: 11, height: 24 }}>discard</button>
              <button onClick={onAcceptAll} className="btn btn-accent mono" style={{ fontSize: 11, height: 24 }}>
                accept all ↓
              </button>
            </div>
          </div>

          <div style={{ padding: "10px 12px 16px" }}>
            {/* Reasoning card */}
            {reasoning && (
              <div style={{
                background: "color-mix(in oklch, var(--accent) 6%, var(--bg-1))",
                border: "1px solid var(--accent-line)",
                borderRadius: 8, padding: "10px 12px", marginBottom: 10,
              }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, display: "flex", gap: 5, alignItems: "center" }}>
                  <Icon name="sparkle" size={10} /> rationale
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--fg-1)" }}>{reasoning}</div>
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
  const nodeColors: Record<string, string> = {
    extraction: "var(--blue)", analysis: "var(--amber)",
    optimization: "var(--accent)", validation: "var(--green)",
  };
  const done = aiState === "review" || aiState === "accepted";

  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
      {nodes.map((n, i) => {
        const seen = activities.filter(a => a.node === n).length;
        const isCurrent = aiState === "streaming" && seen > 0 &&
          activities.findLast(a => a.node === n) === activities[activities.length - 1];
        const isFinished = done || seen > 0;
        const color = nodeColors[n];
        return (
          <div key={n} style={{
            flex: 1, padding: "7px 8px",
            borderRight: i < nodes.length - 1 ? "1px solid var(--line-soft)" : "none",
            background: isCurrent ? `color-mix(in oklch, ${color} 6%, var(--bg-1))` : "transparent",
            transition: "background 0.2s",
          }}>
            <div className="mono" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600 }}>
              <span style={{
                width: 6, height: 6, borderRadius: 99, flexShrink: 0,
                background: isFinished ? color : "var(--line)",
                boxShadow: isCurrent ? `0 0 6px ${color}` : "none",
                transition: "background 0.2s, box-shadow 0.2s",
              }} />
              <span style={{ color: isFinished ? color : "var(--fg-4)", letterSpacing: "0.04em" }}>
                {n.slice(0, 6)}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--fg-4)", marginTop: 2, paddingLeft: 10 }}>
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
function ATSPane({ ats, heatmap, setHeatmap, onFix, aiState, onExportPlainText }: {
  ats: ATSAnalysis | null; heatmap: boolean; setHeatmap: (v: boolean) => void;
  onFix?: () => void; aiState?: string; onExportPlainText?: () => void;
}) {
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
  const failCount = ats.checkpoints.filter(c => !c.passed).length;
  const isBusy = aiState === "streaming" || aiState === "review";
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

        {/* Fix All button */}
        {failCount > 0 && onFix && (
          <button
            onClick={onFix}
            disabled={isBusy}
            className="btn btn-accent mono"
            style={{ marginTop: 12, width: "100%", justifyContent: "center", height: 32, fontSize: 12 }}
          >
            <Icon name="sparkle" size={11} />
            {isBusy ? "fixing…" : `auto-fix ${failCount} issue${failCount !== 1 ? "s" : ""} with AI`}
          </button>
        )}

        <button
          onClick={() => setHeatmap(!heatmap)}
          className="btn mono"
          style={{
            marginTop: 8, width: "100%", justifyContent: "center",
            background: heatmap ? "var(--accent-soft)" : "var(--bg-2)",
            color: heatmap ? "var(--accent)" : "var(--fg-1)",
            borderColor: heatmap ? "var(--accent-line)" : "var(--line)",
            height: 30, fontSize: 12,
          }}
        >
          <Icon name="flame" size={12} />
          {heatmap ? "hide heatmap" : "show heatmap on resume"}
          <span className="kbd">Ctrl+H</span>
        </button>
        {onExportPlainText && (
          <button
            onClick={onExportPlainText}
            className="btn mono"
            style={{ marginTop: 6, width: "100%", justifyContent: "center", height: 28, fontSize: 11, color: "var(--fg-2)" }}
          >
            <Icon name="download" size={11} /> export ATS-safe .txt
          </button>
        )}
      </div>

      {/* category breakdown */}
      {ats.breakdown && (
        <div style={{ padding: "16px", borderBottom: "1px solid var(--line)" }}>
          <SectionLabel>score breakdown</SectionLabel>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <CategoryBar name="Contact" cat={ats.breakdown.contact} />
            <CategoryBar name="Completeness" cat={ats.breakdown.completeness} />
            <CategoryBar name="Bullets" cat={ats.breakdown.bullets} />
            <CategoryBar name="Structure" cat={ats.breakdown.structure} />
            {ats.breakdown.keywords && (
              <CategoryBar name="Keywords (JD)" cat={ats.breakdown.keywords} />
            )}
          </div>
        </div>
      )}

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

      {/* checkpoints grouped by category */}
      <CheckpointsGrouped checkpoints={ats.checkpoints} />

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

const CATEGORY_COLORS: Record<string, string> = {
  contact: "var(--blue)",
  completeness: "var(--amber)",
  bullets: "var(--accent)",
  structure: "var(--green)",
  keywords: "var(--red)",
};

const CATEGORY_LABELS: Record<string, string> = {
  contact: "Contact",
  completeness: "Completeness",
  bullets: "Bullets",
  structure: "Structure",
  keywords: "Keywords",
};

function CategoryBar({ name, cat }: { name: string; cat: ATSCategoryScore }) {
  const key = name.toLowerCase().split(" ")[0];
  const color = CATEGORY_COLORS[key] || "var(--accent)";
  const pct = Math.max(0, Math.min(100, cat.pct));
  const tone = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 4, gap: 6,
      }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-1)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
          {name}
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
          {cat.score}/{cat.max} · <span style={{ color: tone }}>{pct}%</span>
        </span>
      </div>
      <div style={{
        height: 6, background: "var(--bg-3)", borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: tone,
          transition: "width 600ms ease, background 300ms ease",
          borderRadius: 99,
        }} />
      </div>
    </div>
  );
}

function CheckpointsGrouped({ checkpoints }: { checkpoints: ATSCheckpoint[] }) {
  const groups: Record<string, ATSCheckpoint[]> = {};
  for (const cp of checkpoints) {
    const cat = cp.category || "other";
    (groups[cat] ||= []).push(cp);
  }
  const order = ["contact", "completeness", "bullets", "structure", "keywords"];
  const orderedKeys = order.filter(k => groups[k]?.length).concat(
    Object.keys(groups).filter(k => !order.includes(k))
  );

  return (
    <div style={{ padding: "16px", borderBottom: "1px solid var(--line)" }}>
      <SectionLabel>checkpoints</SectionLabel>
      <div style={{ marginTop: 10, display: "grid", gap: 14 }}>
        {orderedKeys.map(catKey => {
          const items = groups[catKey];
          const passCount = items.filter(c => c.passed).length;
          const color = CATEGORY_COLORS[catKey] || "var(--fg-2)";
          return (
            <div key={catKey}>
              <div className="mono" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase",
                letterSpacing: "0.1em", marginBottom: 6,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
                  {CATEGORY_LABELS[catKey] || catKey}
                </span>
                <span style={{ color: passCount === items.length ? "var(--green)" : "var(--fg-3)" }}>
                  {passCount}/{items.length}
                </span>
              </div>
              {items.map((cp, i) => (
                <div key={cp.id} className="mono" style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontSize: 11.5, padding: "5px 8px", borderRadius: 4,
                  color: "var(--fg-1)",
                  background: i % 2 === 0 ? "transparent" : "color-mix(in oklch, var(--bg-2) 50%, transparent)",
                }}>
                  <span style={{ color: cp.passed ? "var(--green)" : "var(--red)", width: 14, display: "inline-flex", justifyContent: "center" }}>
                    {cp.passed ? <Icon name="check" size={11} /> : <Icon name="x" size={11} />}
                  </span>
                  <span style={{ flex: 1 }}>{cp.label}</span>
                  {cp.detail && (
                    <span style={{ fontSize: 10, color: "var(--fg-4)" }}>{cp.detail}</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
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
function VersionsPane({ versions, onRestore, onShowDiff }: { versions: VersionEntry[]; onRestore: (id: string) => void; onShowDiff?: () => void }) {
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionLabel>git log · resume</SectionLabel>
          {onShowDiff && versions.length >= 2 && (
            <button onClick={onShowDiff} className="btn btn-ghost mono" style={{ height: 22, fontSize: 10, padding: "0 8px" }}>
              <Icon name="branch" size={10} /> diff viewer
            </button>
          )}
        </div>
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
