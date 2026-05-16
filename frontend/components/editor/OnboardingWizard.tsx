"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";

interface OnboardingWizardProps {
  onComplete: (choice: "upload" | "scratch" | "sample") => void;
  onSkip: () => void;
}

const STEPS = [
  {
    icon: "✦",
    title: "Welcome to Resume Agent",
    subtitle: "AI-native resume editor with real-time ATS optimization",
    description: "Let's get you set up in under a minute. Your resume will be scored, analyzed, and improved by AI — all privately on your account.",
    cta: null,
  },
  {
    icon: "⬆",
    title: "Import your resume",
    subtitle: "Or start from scratch",
    description: "Upload a PDF, DOCX, or paste plain text. The AI will extract and structure every section automatically.",
    cta: null,
  },
  {
    icon: "◎",
    title: "You're ready",
    subtitle: "Here's what happens next",
    description: "Your resume gets parsed → ATS scored → AI suggestions generated. You review and accept changes one by one.",
    cta: null,
  },
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--line)",
        borderRadius: 18, width: 520, padding: "36px 40px 32px",
        boxShadow: "0 32px 100px rgba(0,0,0,0.5)",
        position: "relative",
      }}>
        {/* Skip */}
        <button
          onClick={onSkip}
          className="mono"
          style={{
            position: "absolute", top: 18, right: 18,
            background: "transparent", border: 0,
            fontSize: 11, color: "var(--fg-4)", cursor: "pointer",
          }}
        >skip intro</button>

        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "var(--bg-3)", border: "1px solid var(--line)",
          display: "grid", placeItems: "center", marginBottom: 20,
          fontSize: 22,
        }}>{STEPS[step].icon}</div>

        {/* Content */}
        <div style={{ marginBottom: 28 }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
            step {step + 1} of {STEPS.length}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--fg-0)", letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            {STEPS[step].title}
          </h2>
          <div style={{ fontSize: 13, color: "var(--accent)", marginBottom: 10 }}>{STEPS[step].subtitle}</div>
          <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.65, margin: 0 }}>{STEPS[step].description}</p>
        </div>

        {/* Step 1: what to expect bullets */}
        {step === 0 && (
          <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
            {[
              ["◎", "ATS score checker", "See exactly why your resume gets filtered out"],
              ["⚡", "AI rewriter", "Fix issues with targeted, section-scoped rewrites"],
              ["↗", "JD matcher", "Paste any job posting to see your fit score"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{
                display: "flex", gap: 12, padding: "10px 14px",
                background: "var(--bg-2)", borderRadius: 8,
                border: "1px solid var(--line)",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-0)" }}>{title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: import options */}
        {step === 1 && (
          <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
            <button onClick={() => onComplete("upload")} className="btn btn-accent mono" style={{ height: 42, justifyContent: "center", fontSize: 13 }}>
              <Icon name="download" size={13} /> Upload PDF / DOCX / TXT
            </button>
            <button onClick={() => onComplete("sample")} className="btn btn-ghost mono" style={{ height: 38, justifyContent: "center", fontSize: 12 }}>
              <Icon name="sparkle" size={12} /> Load sample resume
            </button>
            <button onClick={() => onComplete("scratch")} className="btn btn-ghost mono" style={{ height: 38, justifyContent: "center", fontSize: 12 }}>
              ✏ Start from scratch
            </button>
          </div>
        )}

        {/* Step 3: quick tips */}
        {step === 2 && (
          <div style={{ display: "grid", gap: 6, marginBottom: 24 }}>
            {[
              ["Ctrl+Enter", "Run full AI rewrite"],
              ["Ctrl+K", "Open command palette"],
              ["?", "Show keyboard shortcuts"],
              ["Click any field", "Edit inline"],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12, color: "var(--fg-1)" }}>{desc}</span>
                <span className="kbd mono" style={{ fontSize: 10.5, padding: "2px 8px", background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--fg-2)" }}>{key}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 20 : 6, height: 6, borderRadius: 99,
                  background: i === step ? "var(--accent)" : "var(--bg-3)",
                  border: 0, cursor: "pointer", padding: 0,
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {!isFirst && (
              <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost mono" style={{ height: 36, fontSize: 12 }}>
                ← back
              </button>
            )}
            {!isLast ? (
              <button onClick={() => setStep(s => s + 1)} className="btn btn-accent mono" style={{ height: 36, fontSize: 13 }}>
                next →
              </button>
            ) : (
              <button onClick={() => onComplete("upload")} className="btn btn-accent mono" style={{ height: 36, fontSize: 13 }}>
                get started →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
