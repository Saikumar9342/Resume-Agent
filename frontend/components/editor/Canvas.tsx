"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { useResumeStore } from "@/store/resumeStore";
import { SectionChat } from "./SectionChat";
import type { ResumeContent, ATSAnalysis, ResumeExperience, ResumeStyle } from "@/types/resume";
import {
  MinimalTemplate, ClassicTemplate, ModernTemplate,
  ExecutiveTemplate, CompactTemplate, CreativeTemplate,
} from "./TemplatePicker";
import type { TemplateId } from "./TemplatePicker";

type SectionId = "contact" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications";

interface CanvasProps {
  resume: ResumeContent | null;
  rawText: string;
  activeSection: SectionId;
  heatmap: boolean;
  onToggleHeatmap: () => void;
  aiState: "idle" | "streaming" | "review" | "accepted";
  ats: ATSAnalysis | null;
  onTextChange: (text: string) => void;
  onSectionRewrite?: (section: string) => void;
  requestGhost?: (context: string) => void;
  resumeId?: string | null;
  resumeStyle?: ResumeStyle;
  template?: TemplateId;
}

export function Canvas({
  resume, rawText, activeSection, heatmap, onToggleHeatmap,
  aiState, ats, onTextChange, onSectionRewrite, requestGhost, resumeId,
  resumeStyle, template = "classic",
}: CanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ai, updateContent } = useResumeStore();
  const [canvasMode, setCanvasMode] = useState<"edit" | "preview">("edit");

  const scrollToSection = (sec: string) => {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-sec="${sec}"]`) as HTMLElement | null;
    if (!el) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    container.scrollBy({ top: elTop - containerTop - 24, behavior: "smooth" });
  };

  useEffect(() => { scrollToSection(activeSection); }, [activeSection]);
  useEffect(() => { if (ai.streamingSection) scrollToSection(ai.streamingSection); }, [ai.streamingSection]);

  const hasContent = resume && (
    resume.contact?.name || resume.contact?.email ||
    resume.summary || (resume.experience?.length ?? 0) > 0
  );

  return (
    <main style={{
      background: "var(--bg-0)",
      display: "flex", flexDirection: "column",
      minHeight: 0, height: "100%",
      borderRight: "1px solid var(--line)",
      position: "relative",
    }}>
      {/* tab strip */}
      <div style={{
        height: 34, display: "flex", alignItems: "center",
        background: "var(--bg-1)", borderBottom: "1px solid var(--line)",
        padding: "0 8px", gap: 4, flexShrink: 0,
      }}>
        <CanvasTab active={canvasMode === "edit"} label="resume.md" onClick={() => setCanvasMode("edit")} />
        <CanvasTab active={canvasMode === "preview"} label="preview" onClick={() => setCanvasMode("preview")} />
        <div style={{ flex: 1 }} />
        {canvasMode === "edit" && (
          <button
            onClick={onToggleHeatmap}
            className="btn mono"
            style={{
              background: heatmap ? "var(--accent-soft)" : "transparent",
              color: heatmap ? "var(--accent)" : "var(--fg-2)",
              borderColor: heatmap ? "var(--accent-line)" : "transparent",
              height: 24, fontSize: 11,
            }}
          >
            <Icon name="flame" size={11} /> ats heatmap
          </button>
        )}
        {canvasMode === "preview" && (
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)", paddingRight: 4 }}>
            live preview · changes apply instantly
          </span>
        )}
      </div>

      {canvasMode === "preview" && hasContent ? (
        /* Live template preview — reflects style customizer in real time */
        <div style={{ flex: 1, overflow: "auto", background: "#e8e8e8", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 24px 48px" }}>
          <div style={{ width: 794, background: "#fff", boxShadow: "0 2px 20px rgba(0,0,0,0.18)", borderRadius: 2 }}>
            {template === "minimal"   && <MinimalTemplate   resume={resume!} resumeStyle={resumeStyle} />}
            {template === "classic"   && <ClassicTemplate   resume={resume!} resumeStyle={resumeStyle} />}
            {template === "modern"    && <ModernTemplate    resume={resume!} resumeStyle={resumeStyle} />}
            {template === "executive" && <ExecutiveTemplate resume={resume!} resumeStyle={resumeStyle} />}
            {template === "compact"   && <CompactTemplate   resume={resume!} resumeStyle={resumeStyle} />}
            {template === "creative"  && <CreativeTemplate  resume={resume!} resumeStyle={resumeStyle} />}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} style={{
          flex: 1, overflow: "auto",
          display: "flex", flexDirection: "column",
          alignItems: "center",
          padding: "16px 36px 0",
        }}>
          {hasContent ? (
            <ResumeArticle
              resume={resume!}
              heatmap={heatmap}
              aiState={aiState}
              streamingSection={ai.streamingSection}
              sectionTokens={ai.sectionTokens}
              ats={ats}
              ghostText={ai.ghostText}
              onUpdate={updateContent}
              onSectionRewrite={onSectionRewrite}
              requestGhost={requestGhost}
              resumeId={resumeId ?? null}
            />
          ) : (
            <RawTextFallback rawText={rawText} aiState={aiState} />
          )}
          <div style={{ height: heatmap && ats ? 80 : 48, flexShrink: 0 }} />
        </div>
      )}

      {canvasMode === "edit" && heatmap && ats && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          padding: "12px 0 14px",
          background: "linear-gradient(to top, var(--bg-0) 60%, transparent)",
          pointerEvents: "none", zIndex: 10,
        }}>
          <HeatLegend ats={ats} />
        </div>
      )}
    </main>
  );
}

/* ── helpers ── */

function CanvasTab({ active, label, onClick }: { active?: boolean; label: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative", height: 34, padding: "0 12px",
        display: "flex", alignItems: "center", gap: 6,
        background: active ? "var(--bg-0)" : "transparent",
        borderRight: "1px solid var(--line)",
        borderLeft: active ? "1px solid var(--line)" : "1px solid transparent",
        marginBottom: -1, fontSize: 12,
        color: active ? "var(--fg-0)" : "var(--fg-3)", cursor: "pointer",
      }} className="mono"
    >
      {label === "resume.md" && <Icon name="doc" size={12} />}
      {label}
      {active && <span style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: "var(--accent)" }} />}
    </div>
  );
}

function bulletHeat(bullet: string, missingKw: string[]): "red" | "amber" | "green" | null {
  if (!missingKw.length) return null;
  const lower = bullet.toLowerCase();
  const words: string[] = lower.match(/\w{4,}/g) ?? [];
  const hasNumbers = /\d/.test(bullet);
  const hasAction = /^(spearhead|led|built|designed|developed|implemented|managed|created|improved|increased|reduced|delivered|launched|architected|engineered|optimized|drove|mentored)/i.test(bullet.trim());
  const matchedKw = missingKw.filter(k => words.includes(k.toLowerCase())).length;
  if (hasNumbers && hasAction) return "green";
  if (matchedKw > 0 || hasAction) return "amber";
  return "red";
}

function SectionHeader({ label, count, onRewrite, isStreaming, onChat }: {
  label: string; count?: string;
  onRewrite?: () => void; isStreaming?: boolean;
  onChat?: (e: React.MouseEvent) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="mono" style={{ color: "var(--fg-3)", fontSize: 11, width: 28, textAlign: "right" }}>{"<>"}</span>
      <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)", fontWeight: 600 }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      {count && <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10.5 }}>{count}</span>}
      {hover && onChat && !isStreaming && (
        <button
          onClick={onChat}
          className="btn mono"
          style={{ height: 20, fontSize: 10, padding: "0 7px", background: "var(--bg-2)", color: "var(--fg-2)", borderColor: "var(--line)" }}
          title="Ask AI about this section"
        >
          <Icon name="sparkle" size={9} /> chat
        </button>
      )}
      {onRewrite && (hover || isStreaming) && (
        <button
          onClick={onRewrite}
          disabled={isStreaming}
          className="btn mono"
          style={{
            height: 20, fontSize: 10, padding: "0 7px",
            background: isStreaming ? "var(--accent-soft)" : "var(--bg-2)",
            color: isStreaming ? "var(--accent)" : "var(--fg-2)",
            borderColor: isStreaming ? "var(--accent-line)" : "var(--line)",
          }}
        >
          <Icon name="sparkle" size={9} />
          {isStreaming ? "rewriting…" : "rewrite"}
        </button>
      )}
    </div>
  );
}

/* ── Inline editable field ── */
function EditableText({
  value, onSave, multiline = false, style: styleProp, className,
  placeholder = "click to edit", inputWidth,
}: {
  value: string; onSave: (v: string) => void;
  multiline?: boolean; style?: React.CSSProperties; className?: string;
  placeholder?: string; inputWidth?: number | string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim());
  };

  if (editing) {
    const shared: React.CSSProperties = {
      ...styleProp, width: inputWidth ?? "100%", background: "color-mix(in oklch, var(--accent) 5%, var(--bg-1))",
      border: "1px solid var(--accent-line)", borderRadius: 4, outline: "none",
      fontFamily: "inherit", fontSize: "inherit", color: "inherit", lineHeight: "inherit",
      padding: "2px 6px", resize: "none",
    };
    if (multiline) {
      return (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
          rows={Math.max(3, draft.split("\n").length)}
          style={shared}
          autoFocus
        />
      );
    }
    return (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        style={shared}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        ...styleProp, cursor: "text", borderRadius: 3,
        outline: "1px solid transparent",
        transition: "outline-color 0.15s",
      }}
      className={className}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.outlineColor = "var(--accent-line)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.outlineColor = "transparent"; }}
    >
      {value || <span style={{ color: "var(--fg-4)", fontStyle: "italic" }}>{placeholder}</span>}
    </span>
  );
}

/* ── Bullet AI quick-actions menu ── */
const BULLET_ACTIONS = [
  { id: "metric", label: "+ metric", instruction: "Add a specific number, percentage, or quantifiable result to this bullet. Keep everything else the same. Return only the improved bullet." },
  { id: "action", label: "action verb", instruction: "Start this bullet with a strong action verb (Led, Built, Reduced, Delivered, Improved, etc.). Return only the improved bullet." },
  { id: "star", label: "STAR", instruction: "Rewrite this bullet using the STAR method (Situation, Task, Action, Result) in one concise sentence. Return only the improved bullet." },
  { id: "shorter", label: "shorter", instruction: "Make this bullet more concise — max 15 words. Preserve the key achievement. Return only the improved bullet." },
];

function BulletAIMenu({ bullet, onApply }: { bullet: string; onApply: (improved: string) => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (actionId: string, instruction: string) => {
    setLoading(actionId);
    try {
      const token = JSON.parse(localStorage.getItem("resume-agent-auth") ?? "{}").state?.token ?? "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/bullet-rewrite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bullet, instruction }),
        }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.improved) onApply(data.improved);
    } catch {
      // silent fail — user keeps original
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
      {BULLET_ACTIONS.map(a => (
        <button
          key={a.id}
          onClick={e => { e.stopPropagation(); run(a.id, a.instruction); }}
          disabled={!!loading}
          className="mono"
          style={{
            height: 18, fontSize: 9.5, padding: "0 6px", borderRadius: 4,
            background: loading === a.id ? "var(--accent-soft)" : "var(--bg-3)",
            color: loading === a.id ? "var(--accent)" : "var(--fg-3)",
            border: "1px solid var(--line)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 3,
            transition: "background 0.15s",
          }}
          title={a.instruction}
        >
          {loading === a.id ? "…" : a.label}
        </button>
      ))}
    </div>
  );
}

/* ── Editable bullet with ghost text ── */
function EditableBullet({
  value, onSave, onDelete, onAdd, heat, heatmap, requestGhost, ghostText,
}: {
  value: string; onSave: (v: string) => void; onDelete: () => void; onAdd: () => void;
  heat: "red" | "amber" | "green" | null; heatmap: boolean;
  requestGhost?: (ctx: string) => void; ghostText?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [showGhost, setShowGhost] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    setShowGhost(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim());
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && requestGhost && !e.shiftKey) {
      e.preventDefault();
      if (ghostText && showGhost) {
        setDraft(d => d + ghostText);
        setShowGhost(false);
      } else {
        requestGhost(draft);
        setShowGhost(true);
      }
    } else if (e.key === "Escape") {
      if (showGhost) { setShowGhost(false); return; }
      setEditing(false); setDraft(value);
    } else if (e.key === "Enter" && e.metaKey) {
      e.preventDefault(); commit(); onAdd();
    } else if (e.key === "Backspace" && draft === "") {
      e.preventDefault(); onDelete();
    } else {
      setShowGhost(false);
    }
  };

  const liStyle: React.CSSProperties = {
    fontSize: 13, lineHeight: 1.55, color: "var(--fg-1)",
    padding: heatmap ? "6px 12px 6px 20px" : "3px 0 3px 16px",
    position: "relative", borderRadius: 4, marginBottom: 2,
    background: heat === "green"
      ? "color-mix(in oklch, var(--green) 8%, transparent)"
      : heat === "amber"
      ? "color-mix(in oklch, var(--amber) 8%, transparent)"
      : heat === "red"
      ? "color-mix(in oklch, var(--red) 8%, transparent)"
      : "transparent",
    borderLeft: heat ? `2px solid var(--${heat})` : heatmap ? "2px solid transparent" : "none",
    transition: "background 0.3s ease, border-color 0.3s ease",
  };

  if (editing) {
    return (
      <li style={{ ...liStyle, padding: "4px 4px 4px 16px" }}>
        <span className="mono" style={{ position: "absolute", left: heatmap ? 6 : 0, top: 8, color: "var(--accent)", fontSize: 10 }}>›</span>
        <div style={{ position: "relative" }}>
          <textarea
            ref={ref}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            rows={Math.max(1, Math.ceil(draft.length / 70))}
            autoFocus
            style={{
              width: "100%", background: "color-mix(in oklch, var(--accent) 5%, var(--bg-1))",
              border: "1px solid var(--accent-line)", borderRadius: 4, outline: "none",
              fontFamily: "var(--sans)", fontSize: 13, color: "var(--fg-0)", lineHeight: 1.55,
              padding: "3px 6px", resize: "none",
            }}
          />
          {showGhost && ghostText && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: "var(--bg-2)", border: "1px solid var(--accent-line)",
              borderRadius: 4, padding: "6px 8px", marginTop: 2,
              fontSize: 12, color: "var(--accent)", zIndex: 10,
            }}>
              <span style={{ color: "var(--fg-3)", fontSize: 10 }} className="mono">Tab to accept · Esc to dismiss</span>
              <div style={{ marginTop: 4, lineHeight: 1.5 }}>{ghostText}</div>
            </div>
          )}
          {showGhost && !ghostText && (
            <div className="mono" style={{
              position: "absolute", top: "100%", left: 0,
              fontSize: 10.5, color: "var(--fg-3)", marginTop: 2,
            }}>generating suggestion…</div>
          )}
        </div>
        <div className="mono" style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 10, color: "var(--fg-3)" }}>
          <span>↵⌘ new bullet</span>
          {requestGhost && <span>Tab ghost</span>}
          <span>Esc cancel</span>
        </div>
      </li>
    );
  }

  return (
    <li
      style={liStyle}
      onClick={() => setEditing(true)}
      className="bullet-hover"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      title="Click to edit"
    >
      <span className="mono" style={{ position: "absolute", left: heatmap ? 6 : 0, top: heatmap ? 8 : 5, color: heat ? `var(--${heat})` : "var(--fg-3)", fontSize: 10 }}>›</span>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, paddingRight: 20 }}>
        <span style={{ cursor: "text", flex: 1 }}>{value}</span>
        {showMenu && (
          <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, paddingTop: 1 }}>
            <BulletAIMenu bullet={value} onApply={improved => { onSave(improved); }} />
          </div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="bullet-del mono"
        style={{
          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: 0, color: "var(--fg-4)", fontSize: 10,
          cursor: "pointer", opacity: 0, transition: "opacity 0.1s", padding: "2px 4px",
        }}
      >×</button>
    </li>
  );
}

/* ── Main Article ── */
interface ArticleProps {
  resume: ResumeContent;
  heatmap: boolean;
  aiState: string;
  streamingSection: string | null;
  sectionTokens: Record<string, string>;
  ats: ATSAnalysis | null;
  ghostText: string;
  onUpdate: (c: ResumeContent) => void;
  onSectionRewrite?: (section: string) => void;
  requestGhost?: (context: string) => void;
  resumeId: string | null;
}

function sectionStyle(sec: string, streamingSection: string | null, isStreaming: boolean): React.CSSProperties {
  if (!isStreaming || !streamingSection) return {};
  const isActive = streamingSection === sec;
  return {
    transition: "filter 0.4s ease, opacity 0.4s ease",
    filter: isActive ? "none" : "blur(1.5px)",
    opacity: isActive ? 1 : 0.5,
    pointerEvents: "none",
  };
}

function StreamingText({ text }: { text: string }) {
  return (
    <span style={{ color: "var(--fg-0)" }}>
      {text}
      <span className="caret" style={{ display: "inline-block", width: 7, height: "1em", background: "var(--accent)", marginLeft: 2, verticalAlign: "text-bottom", borderRadius: 1 }} />
    </span>
  );
}

function PhotoUpload({ photo, onPhoto, onRemove }: { photo?: string; onPhoto: (dataUrl: string) => void; onRemove: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) onPhoto(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragOver={e => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={e => { e.preventDefault(); setHover(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        title={photo ? "Click to change photo" : "Click or drag to add photo"}
        style={{
          width: 76, height: 76, borderRadius: 8,
          border: `2px ${hover || !photo ? "dashed" : "solid"} ${hover ? "var(--accent)" : "var(--line)"}`,
          background: photo ? "transparent" : "var(--bg-2)",
          cursor: "pointer", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", transition: "border-color 0.15s",
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {photo ? (
          <>
            <img src={photo} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {hover && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Icon name="edit" size={14} style={{ color: "#fff" }} />
                <span className="mono" style={{ fontSize: 9, color: "#fff" }}>change</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", pointerEvents: "none" }}>
            <Icon name="user" size={18} style={{ color: hover ? "var(--accent)" : "var(--fg-4)", display: "block", margin: "0 auto 4px" }} />
            <span className="mono" style={{ fontSize: 9, color: hover ? "var(--accent)" : "var(--fg-4)" }}>add photo</span>
          </div>
        )}
      </div>

      {/* Remove button — only shown when photo exists */}
      {photo && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          title="Remove photo"
          style={{
            position: "absolute", top: -7, right: -7,
            width: 18, height: 18, borderRadius: 99,
            background: "var(--bg-0)", border: "1.5px solid var(--line)",
            color: "var(--fg-3)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, lineHeight: 1, padding: 0,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--red)"; (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-3)"; }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ResumeArticle({ resume, heatmap, aiState, streamingSection, sectionTokens, ats, ghostText, onUpdate, onSectionRewrite, requestGhost, resumeId }: ArticleProps) {
  const isStreaming = aiState === "streaming";
  const missingKw = ats?.missing_keywords ?? [];
  const [activeChat, setActiveChat] = useState<{ section: string; rect: DOMRect } | null>(null);

  const openChat = (section: string, e: React.MouseEvent) => {
    if (!resumeId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveChat({ section, rect });
  };

  const patch = useCallback((updater: (c: ResumeContent) => ResumeContent) => {
    onUpdate(updater(resume));
  }, [resume, onUpdate]);

  return (
    <article style={{
      width: 760, maxWidth: "100%",
      background: "var(--bg-1)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "48px 56px 64px",
      color: "var(--fg-0)", position: "relative",
      boxShadow: "0 40px 60px -30px black", alignSelf: "flex-start",
    }}>

      {/* ── Contact ── */}
      <header data-sec="contact" style={{ marginBottom: 26, opacity: 1, filter: "none", display: "flex", gap: 18, alignItems: "flex-start" }}>
        {/* Name + contact info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditableText
            value={resume.contact?.name || ""}
            placeholder="Your Name"
            onSave={v => patch(c => ({ ...c, contact: { ...c.contact, name: v } }))}
            style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, display: "block", width: "100%" }}
          />
          <div className="mono" style={{ display: "flex", gap: 10, color: "var(--fg-2)", fontSize: 11.5, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            {(["email", "phone", "location", "linkedin", "github"] as const).map((field, i) => (
              <span key={field} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {i > 0 && <span style={{ color: "var(--fg-4)" }}>·</span>}
                <EditableText
                  value={resume.contact?.[field] || ""}
                  placeholder={field}
                  onSave={v => patch(c => ({ ...c, contact: { ...c.contact, [field]: v } }))}
                  style={{ fontSize: 11.5 }}
                />
              </span>
            ))}
          </div>
        </div>

        {/* Photo upload — right side */}
        <PhotoUpload
          photo={resume.contact?.photo}
          onPhoto={dataUrl => patch(c => ({ ...c, contact: { ...c.contact, photo: dataUrl } }))}
          onRemove={() => patch(c => ({ ...c, contact: { ...c.contact, photo: undefined } }))}
        />
      </header>

      {/* ── Summary ── */}
      {(resume.summary !== undefined || sectionTokens["summary"]) && (
        <div data-sec="summary" style={sectionStyle("summary", streamingSection, isStreaming)}>
          <SectionHeader
            label="Summary"
            onChat={resumeId ? (e) => openChat("summary", e) : undefined}
            onRewrite={() => onSectionRewrite?.("summary")}
            isStreaming={streamingSection === "summary" && isStreaming}
          />
          {streamingSection === "summary"
            ? <p style={{ margin: "8px 0 28px", color: "var(--fg-1)", lineHeight: 1.6, fontSize: 14 }}>
                <StreamingText text={sectionTokens["summary"] ?? ""} />
              </p>
            : <EditableText
                value={resume.summary || ""}
                placeholder="Write a professional summary…"
                multiline
                onSave={v => patch(c => ({ ...c, summary: v }))}
                style={{ display: "block", margin: "8px 0 28px", color: "var(--fg-1)", lineHeight: 1.6, fontSize: 14, width: "100%" }}
              />
          }
        </div>
      )}

      {/* ── Experience ── */}
      {((resume.experience && resume.experience.length > 0) || streamingSection === "experience") && (
        <div data-sec="experience" style={sectionStyle("experience", streamingSection, isStreaming)}>
          <SectionHeader
            label="Experience"
            count={resume.experience ? `${resume.experience.length} roles` : undefined}
            onChat={resumeId ? (e) => openChat("experience", e) : undefined}
            onRewrite={() => onSectionRewrite?.("experience")}
            isStreaming={streamingSection === "experience" && isStreaming}
          />
          <div style={{ marginBottom: 28 }}>
            {resume.experience?.map((exp, ei) => (
              <div key={ei} style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <EditableText
                      value={exp.company || ""}
                      placeholder="Company"
                      onSave={v => patch(c => {
                        const ex = [...c.experience];
                        ex[ei] = { ...ex[ei], company: v };
                        return { ...c, experience: ex };
                      })}
                      style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em", display: "block" }}
                    />
                    <EditableText
                      value={exp.title || ""}
                      placeholder="Job Title"
                      onSave={v => patch(c => {
                        const ex = [...c.experience];
                        ex[ei] = { ...ex[ei], title: v };
                        return { ...c, experience: ex };
                      })}
                      style={{ fontSize: 13, color: "var(--fg-1)", display: "block", marginTop: 2 }}
                    />
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)", textAlign: "right", flexShrink: 0, display: "flex", gap: 4, alignItems: "center" }}>
                    <EditableText
                      value={exp.start || ""}
                      placeholder="Start"
                      onSave={v => patch(c => { const ex = [...c.experience]; ex[ei] = { ...ex[ei], start: v }; return { ...c, experience: ex }; })}
                      style={{ fontSize: 11.5 }}
                      inputWidth={80}
                    />
                    <span style={{ color: "var(--fg-4)" }}>—</span>
                    <EditableText
                      value={exp.end || ""}
                      placeholder="End"
                      onSave={v => patch(c => { const ex = [...c.experience]; ex[ei] = { ...ex[ei], end: v }; return { ...c, experience: ex }; })}
                      style={{ fontSize: 11.5 }}
                      inputWidth={80}
                    />
                  </div>
                </div>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
                  {exp.bullets.map((b, bi) => (
                    <EditableBullet
                      key={bi}
                      value={b}
                      heat={heatmap ? bulletHeat(b, missingKw) : null}
                      heatmap={heatmap}
                      requestGhost={requestGhost}
                      ghostText={ghostText}
                      onSave={v => patch(c => {
                        const ex = [...c.experience];
                        const bullets = [...ex[ei].bullets];
                        bullets[bi] = v;
                        ex[ei] = { ...ex[ei], bullets };
                        return { ...c, experience: ex };
                      })}
                      onDelete={() => patch(c => {
                        const ex = [...c.experience];
                        const bullets = ex[ei].bullets.filter((_, i) => i !== bi);
                        ex[ei] = { ...ex[ei], bullets };
                        return { ...c, experience: ex };
                      })}
                      onAdd={() => patch(c => {
                        const ex = [...c.experience];
                        const bullets = [...ex[ei].bullets];
                        bullets.splice(bi + 1, 0, "");
                        ex[ei] = { ...ex[ei], bullets };
                        return { ...c, experience: ex };
                      })}
                    />
                  ))}
                  {/* Add bullet button */}
                  {!isStreaming && (
                    <li style={{ padding: "3px 0 3px 16px" }}>
                      <button
                        onClick={() => patch(c => {
                          const ex = [...c.experience];
                          ex[ei] = { ...ex[ei], bullets: [...ex[ei].bullets, ""] };
                          return { ...c, experience: ex };
                        })}
                        className="btn btn-ghost mono"
                        style={{ height: 20, fontSize: 10, padding: "0 6px", color: "var(--fg-4)" }}
                      >
                        <Icon name="plus" size={9} /> add bullet
                      </button>
                    </li>
                  )}
                  {streamingSection === "experience" && sectionTokens["experience"] && ei === (resume.experience?.length ?? 1) - 1 && (
                    <li style={{ fontSize: 13, lineHeight: 1.55, color: "var(--fg-1)", padding: "3px 0 3px 16px", position: "relative" }}>
                      <span className="mono" style={{ position: "absolute", left: 0, top: 5, color: "var(--accent)", fontSize: 10 }}>›</span>
                      <StreamingText text={sectionTokens["experience"]} />
                    </li>
                  )}
                </ul>
              </div>
            ))}
            {!isStreaming && (
              <button
                onClick={() => patch(c => ({
                  ...c,
                  experience: [...(c.experience ?? []), { company: "", title: "", start: "", end: "", bullets: [""] } as ResumeExperience],
                }))}
                className="btn btn-ghost mono"
                style={{ marginTop: 12, height: 24, fontSize: 11, color: "var(--fg-3)" }}
              >
                <Icon name="plus" size={10} /> add role
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Education ── */}
      {resume.education && resume.education.length > 0 && (
        <div data-sec="education" style={sectionStyle("education", streamingSection, isStreaming)}>
          <SectionHeader label="Education" onChat={resumeId ? (e) => openChat("education", e) : undefined} onRewrite={() => onSectionRewrite?.("education")} isStreaming={streamingSection === "education" && isStreaming} />
          <div style={{ marginBottom: 28 }}>
            {resume.education.map((edu, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-1)", padding: "4px 0", gap: 12 }}>
                <span style={{ flex: 1 }}>
                  <EditableText
                    value={edu.institution || ""}
                    placeholder="Institution"
                    onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], institution: v }; return { ...c, education: ed }; })}
                    style={{ fontWeight: 600, color: "var(--fg-0)" }}
                  />
                  {" — "}
                  <EditableText
                    value={edu.degree || ""}
                    placeholder="Degree"
                    onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], degree: v }; return { ...c, education: ed }; })}
                  />
                  {" "}
                  <EditableText
                    value={edu.field || ""}
                    placeholder="Field"
                    onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], field: v }; return { ...c, education: ed }; })}
                  />
                </span>
                <EditableText
                  value={edu.year || ""}
                  placeholder="Year"
                  onSave={v => patch(c => { const ed = [...c.education]; ed[i] = { ...ed[i], year: v }; return { ...c, education: ed }; })}
                  style={{ color: "var(--fg-3)", fontSize: 12, flexShrink: 0 }}
                  className="mono"
                  inputWidth={80}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Skills ── */}
      {(resume.skills || streamingSection === "skills") && (
        <div data-sec="skills" style={sectionStyle("skills", streamingSection, isStreaming)}>
          <SectionHeader label="Skills" onChat={resumeId ? (e) => openChat("skills", e) : undefined} onRewrite={() => onSectionRewrite?.("skills")} isStreaming={streamingSection === "skills" && isStreaming} />
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {resume.skills?.technical?.map((s, si) => (
                <EditableSkillChip
                  key={si}
                  value={s}
                  onSave={v => patch(c => {
                    const tech = [...(c.skills?.technical ?? [])];
                    tech[si] = v;
                    return { ...c, skills: { ...c.skills, technical: tech } };
                  })}
                  onDelete={() => patch(c => ({
                    ...c,
                    skills: { ...c.skills, technical: (c.skills?.technical ?? []).filter((_, i) => i !== si) },
                  }))}
                />
              ))}
              <AddSkillChip onAdd={v => patch(c => ({
                ...c,
                skills: { ...c.skills, technical: [...(c.skills?.technical ?? []), v] },
              }))} />
              {streamingSection === "skills" && sectionTokens["skills"] && (
                <span className="mono" style={{
                  fontSize: 11.5, padding: "3px 9px",
                  background: "color-mix(in oklch, var(--accent) 12%, var(--bg-2))",
                  border: "1px solid var(--accent-line)", borderRadius: 4, color: "var(--accent)",
                }}>
                  {sectionTokens["skills"]}
                  <span className="caret" style={{ display: "inline-block", width: 6, height: "0.85em", background: "var(--accent)", marginLeft: 2, verticalAlign: "text-bottom", borderRadius: 1 }} />
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Certifications ── */}
      {resume.certifications && resume.certifications.length > 0 && (
        <div data-sec="certifications" style={sectionStyle("certifications", streamingSection, isStreaming)}>
          <SectionHeader label="Certifications" />
          <div style={{ marginBottom: 28 }}>
            {resume.certifications.map((cert, ci) => (
              <div key={ci} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 13, color: "var(--fg-1)" }}>
                <span className="mono" style={{ color: "var(--accent)", fontSize: 10 }}>✓</span>
                <EditableText
                  value={cert}
                  placeholder="Certification name"
                  onSave={v => patch(c => {
                    const certs = [...(c.certifications ?? [])];
                    certs[ci] = v;
                    return { ...c, certifications: certs };
                  })}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => patch(c => ({ ...c, certifications: (c.certifications ?? []).filter((_, i) => i !== ci) }))}
                  className="btn btn-ghost mono"
                  style={{ width: 20, height: 20, padding: 0, justifyContent: "center", color: "var(--fg-4)", fontSize: 10 }}
                >×</button>
              </div>
            ))}
            <button
              onClick={() => patch(c => ({ ...c, certifications: [...(c.certifications ?? []), ""] }))}
              className="btn btn-ghost mono"
              style={{ marginTop: 6, height: 22, fontSize: 10, color: "var(--fg-3)" }}
            >
              <Icon name="plus" size={9} /> add certification
            </button>
          </div>
        </div>
      )}

      {/* ── Projects ── */}
      {((resume.projects && resume.projects.length > 0) || streamingSection === "projects") && (
        <div data-sec="projects" style={sectionStyle("projects", streamingSection, isStreaming)}>
          <SectionHeader label="Projects" onChat={resumeId ? (e) => openChat("projects", e) : undefined} onRewrite={() => onSectionRewrite?.("projects")} isStreaming={streamingSection === "projects" && isStreaming} />
          <div>
            {resume.projects?.map((p, pi) => (
              <div key={pi} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-1)", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <EditableText
                    value={p.name || ""}
                    placeholder="Project name"
                    onSave={v => patch(c => { const pr = [...c.projects]; pr[pi] = { ...pr[pi], name: v }; return { ...c, projects: pr }; })}
                    style={{ fontWeight: 600 }}
                    className="mono"
                  />
                  {p.technologies?.length > 0 && (
                    <span className="mono" style={{ color: "var(--fg-3)", fontSize: 12 }}>· {p.technologies.join(" / ")}</span>
                  )}
                </div>
                <EditableText
                  value={p.description || ""}
                  placeholder="Project description"
                  multiline
                  onSave={v => patch(c => { const pr = [...c.projects]; pr[pi] = { ...pr[pi], description: v }; return { ...c, projects: pr }; })}
                  style={{ color: "var(--fg-1)", display: "block", marginTop: 2 }}
                />
              </div>
            ))}
            {streamingSection === "projects" && sectionTokens["projects"] && (
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-1)", marginBottom: 6 }}>
                <StreamingText text={sectionTokens["projects"]} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section AI Chat ── */}
      {activeChat && resumeId && (
        <SectionChat
          section={activeChat.section}
          resumeId={resumeId}
          anchorRect={activeChat.rect}
          onClose={() => setActiveChat(null)}
          onApply={(section, improved) => {
            patch(c => ({ ...c, [section]: improved }));
            setActiveChat(null);
          }}
        />
      )}
    </article>
  );
}

/* ── Skill chip editing ── */
function EditableSkillChip({ value, onSave, onDelete }: { value: string; onSave: (v: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft.trim()) onSave(draft.trim()); else onDelete(); }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        autoFocus
        className="mono"
        style={{
          fontSize: 11.5, padding: "3px 9px",
          background: "color-mix(in oklch, var(--accent) 8%, var(--bg-1))",
          border: "1px solid var(--accent-line)", borderRadius: 4, color: "var(--fg-0)",
          width: Math.max(60, draft.length * 8),
        }}
      />
    );
  }

  return (
    <span
      className="mono"
      style={{
        fontSize: 11.5, padding: "3px 9px",
        background: "var(--bg-2)", border: "1px solid var(--line)",
        borderRadius: 4, color: "var(--fg-1)", cursor: "text",
        display: "inline-flex", alignItems: "center", gap: 5,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-line)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
    >
      <span onClick={() => setEditing(true)}>{value}</span>
      <span onClick={onDelete} style={{ color: "var(--fg-4)", cursor: "pointer", fontSize: 10, lineHeight: 1 }}>×</span>
    </span>
  );
}

function AddSkillChip({ onAdd }: { onAdd: (v: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  if (adding) {
    return (
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setAdding(false); if (draft.trim()) { onAdd(draft.trim()); setDraft(""); } }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
        autoFocus
        placeholder="new skill"
        className="mono"
        style={{
          fontSize: 11.5, padding: "3px 9px", width: 100,
          background: "var(--bg-1)", border: "1px dashed var(--accent-line)",
          borderRadius: 4, color: "var(--fg-0)",
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="btn btn-ghost mono"
      style={{ height: 26, fontSize: 11, padding: "0 8px", borderStyle: "dashed", color: "var(--fg-3)" }}
    >
      <Icon name="plus" size={10} /> skill
    </button>
  );
}

/* ── Raw text fallback ── */
function RawTextFallback({ rawText, aiState }: { rawText: string; aiState: string }) {
  return (
    <div style={{
      width: 760, maxWidth: "100%",
      background: "var(--bg-1)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "48px 56px 64px",
      position: "relative", boxShadow: "0 40px 60px -30px black",
      alignSelf: "flex-start",
    }}>
      {aiState === "streaming" && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", pointerEvents: "none" }}>
          <div className="scan-shimmer" style={{ position: "absolute", inset: 0 }} />
        </div>
      )}
      {rawText ? (
        <pre style={{
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6,
          color: "var(--fg-1)", margin: 0,
        }}>{rawText}</pre>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 12, color: "var(--fg-3)" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "var(--bg-2)", border: "1px solid var(--line)",
            display: "grid", placeItems: "center", color: "var(--fg-2)",
          }}>
            <Icon name="doc" size={18} />
          </div>
          <span className="mono" style={{ fontSize: 12 }}>no content yet</span>
          <span style={{ fontSize: 12, textAlign: "center", maxWidth: 280 }}>
            Paste your resume text in the editor or type below, then press Start to analyze
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Heat legend ── */
function HeatLegend({ ats }: { ats: ATSAnalysis }) {
  const isReady = ats.score >= 80;
  return (
    <div className="mono" style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--bg-1)", border: "1px solid var(--line)",
      borderRadius: 999, padding: "6px 14px", fontSize: 11,
      boxShadow: "0 20px 30px -20px black",
    }}>
      <span style={{ color: "var(--fg-3)" }}>heatmap</span>
      <LegendChip color="var(--red)" label={isReady ? "—" : "weak"} />
      <LegendChip color="var(--amber)" label={isReady ? "—" : "thin"} />
      <LegendChip color="var(--green)" label="strong" />
      <span style={{ width: 1, height: 12, background: "var(--line)" }} />
      <span style={{ color: "var(--fg-3)" }}>score</span>
      <span style={{ color: ats.score >= 80 ? "var(--green)" : ats.score >= 60 ? "var(--amber)" : "var(--red)" }}>{ats.score}/100</span>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--fg-2)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}
