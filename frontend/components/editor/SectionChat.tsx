"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";

interface SectionChatProps {
  section: string;
  resumeId: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onApply: (section: string, improved: unknown) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  summary: ["Make it more compelling", "Add keywords", "Shorten to 2 sentences", "Rewrite for senior role"],
  experience: ["Add quantified metrics", "Start bullets with action verbs", "Apply STAR format", "Tailor to tech industry"],
  skills: ["Add trending tech skills", "Remove redundant skills", "Group by category", "Add soft skills"],
  education: ["Add GPA formatting", "Add relevant coursework", "Make it concise"],
  projects: ["Add tech stack details", "Improve project descriptions", "Add impact metrics"],
  certifications: ["Format consistently", "Add dates"],
  contact: ["Add professional links", "Fix formatting"],
};

export function SectionChat({ section, resumeId, anchorRect, onClose, onApply }: SectionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    text: `I can help improve your **${section}** section. What would you like to change?`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem("resume-agent-auth") ?? "{}").state?.token ?? "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/resumes/${resumeId}/section-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ section, instruction: userMsg, history: messages }),
        }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
      if (data.improved_section !== undefined) {
        // Auto-apply if AI returned structured data
        onApply(section, data.improved_section);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Position: try right of anchor, fallback to left
  const top = Math.max(8, anchorRect.top - 20);
  const left = anchorRect.right + 12;
  const rightEdge = left + 320;
  const posLeft = rightEdge > window.innerWidth - 8 ? anchorRect.left - 328 : left;

  const quickPrompts = QUICK_PROMPTS[section] ?? QUICK_PROMPTS.experience;

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9000 }} />

      {/* Chat panel */}
      <div style={{
        position: "fixed", top, left: posLeft, zIndex: 9001,
        width: 320, maxHeight: 460,
        background: "var(--bg-1)", border: "1px solid var(--line)",
        borderRadius: 12, boxShadow: "0 16px 60px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "10px 14px", borderBottom: "1px solid var(--line)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 20, height: 20, borderRadius: 5,
              background: "var(--accent-soft)", border: "1px solid var(--accent-line)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <Icon name="sparkle" size={10} />
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-1)", fontWeight: 600 }}>
              AI · {section}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "var(--fg-3)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "10px 14px", minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              marginBottom: 10,
              display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "85%", padding: "8px 11px", borderRadius: 8,
                background: m.role === "user" ? "var(--accent)" : "var(--bg-2)",
                color: m.role === "user" ? "var(--bg-0)" : "var(--fg-0)",
                fontSize: 12, lineHeight: 1.55,
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: 99,
                  background: "var(--fg-4)",
                  animation: `bounce 1s ease ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div style={{ padding: "0 14px 8px", display: "flex", flexWrap: "wrap", gap: 4 }}>
            {quickPrompts.map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                className="mono"
                style={{
                  fontSize: 10.5, padding: "3px 8px", borderRadius: 4,
                  background: "var(--bg-3)", border: "1px solid var(--line)",
                  color: "var(--fg-2)", cursor: "pointer",
                }}
              >{p}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: "8px 10px", borderTop: "1px solid var(--line)",
          display: "flex", gap: 6, flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={`Ask about ${section}…`}
            className="mono"
            style={{
              flex: 1, background: "var(--bg-2)", border: "1px solid var(--line)",
              borderRadius: 6, padding: "6px 10px", fontSize: 12,
              color: "var(--fg-0)", outline: "none",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="btn btn-accent"
            style={{ width: 30, height: 30, padding: 0, justifyContent: "center", flexShrink: 0 }}
          >
            <Icon name="sparkle" size={11} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  );
}
