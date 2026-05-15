"use client";

import { useState, useEffect } from "react";
import { Icon, Pill } from "@/components/ui/Icon";
import { useAuthStore } from "@/store/authStore";

interface LandingProps {
  onBoot: () => void;
}

export function Landing({ onBoot }: LandingProps) {
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") onBoot();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onBoot]);

  return (
    <div style={{
      height: "100%",
      display: "grid",
      gridTemplateRows: "auto 1fr auto",
      background: "var(--bg-0)",
      color: "var(--fg-0)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient grid */}
      <div className="grid-backdrop" style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none" }} />
      {/* Amber glow */}
      <div style={{
        position: "absolute", left: "50%", top: "55%", transform: "translate(-50%, -50%)",
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, color-mix(in oklch, var(--accent) 18%, transparent), transparent 60%)",
        pointerEvents: "none", filter: "blur(20px)",
      }} />

      {/* Top nav */}
      <header style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 28px",
        borderBottom: "1px solid var(--line-soft)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--accent)" }}><Icon name="logo" size={22} /></span>
          <span className="mono" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>resume-agent</span>
          <span className="mono" style={{ color: "var(--fg-3)", fontSize: 11 }}>v2.0.0</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user ? (
            <>
              <span className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>{user.email}</span>
              <button onClick={clearAuth} className="btn btn-ghost mono">sign out</button>
            </>
          ) : (
            <button onClick={onBoot} className="btn btn-ghost mono">sign in</button>
          )}
          <a
            href="https://github.com/Saikumar9342/Resume-Agent"
            target="_blank"
            rel="noopener noreferrer"
            className="btn mono"
            style={{ background: "var(--bg-2)", textDecoration: "none" }}
          >
            <Icon name="branch" size={12} /> github
          </a>
        </nav>
      </header>

      {/* Hero */}
      <main style={{
        position: "relative", zIndex: 1,
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        gap: 60,
        alignItems: "center",
        padding: "60px 80px",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
            <Pill tone="accent" icon={<Icon name="bolt" size={10} />}>live</Pill>
            <Pill tone="ghost">jd-aware · ats-tuned · diff-first</Pill>
          </div>

          <h1 style={{
            fontFamily: "var(--sans)",
            fontSize: "clamp(38px, 5.2vw, 64px)",
            lineHeight: 1.02,
            letterSpacing: "-0.035em",
            fontWeight: 600,
            margin: 0,
          }}>
            The resume editor<br/>
            for people who<br/>
            <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>read the diff.</span>
          </h1>

          <p style={{
            marginTop: 26, maxWidth: 520,
            color: "var(--fg-1)", fontSize: 16, lineHeight: 1.55,
          }}>
            A keyboard-driven editor that runs your resume through a multi-stage AI pipeline, surfaces every change as a reviewable patch, and scores it against the job description before you accept.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32 }}>
            <button
              onClick={onBoot}
              className="btn btn-accent mono"
              style={{ height: 40, padding: "0 18px", fontSize: 13 }}
            >
              <Icon name="play" size={11} />
              boot editor
              <span className="kbd" style={{
                borderColor: "color-mix(in oklch, var(--bg-0) 50%, transparent)",
                color: "var(--bg-0)",
                background: "color-mix(in oklch, var(--bg-0) 18%, var(--accent))",
                borderBottomWidth: 1,
              }}>↵</span>
            </button>
          </div>

          {/* Feature chips */}
          <div style={{
            marginTop: 48,
            display: "flex", flexWrap: "wrap", gap: 8,
            borderTop: "1px solid var(--line-soft)",
            paddingTop: 20,
          }}>
            {["inline editing","section-level AI rewrite","live JD matching","diff patches","ATS heatmap","version history","PDF export","ghost autocomplete"].map(f => (
              <span key={f} className="mono" style={{
                fontSize: 10.5, padding: "3px 9px",
                background: "var(--bg-2)", border: "1px solid var(--line)",
                borderRadius: 4, color: "var(--fg-2)",
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Right: faux terminal */}
        <div style={{ position: "relative" }}>
          <FauxTerminal />
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        padding: "12px 28px",
        borderTop: "1px solid var(--line-soft)",
        background: "var(--bg-1)",
        fontSize: 11,
      }}>
        <div className="mono" style={{ display: "flex", gap: 14, color: "var(--fg-3)" }}>
          <span><span className="kbd">⌘</span> <span className="kbd">K</span> commands</span>
          <span><span className="kbd">↵</span> boot</span>
        </div>
      </footer>
    </div>
  );
}

function FauxTerminal() {
  const lines = [
    { p: "$", c: "resume-agent init ./my-resume.pdf", color: "var(--fg-0)" },
    { p: "›", c: "parsing · 11 sections · 312 tokens", color: "var(--fg-2)" },
    { p: "›", c: "ats baseline · 67 / 100  (needs work)", color: "var(--amber)" },
    { p: "$", c: "resume-agent rewrite --jd ./role.txt", color: "var(--fg-0)" },
    { p: "›", c: "scanning bullets for weak verb patterns…", color: "var(--fg-2)" },
    { p: "›", c: "3 patches generated · ready for review", color: "var(--accent)" },
    { p: "$", c: "resume-agent ats --refresh", color: "var(--fg-0)" },
    { p: "›", c: "score Δ  67  →  89  ✓ ats-ready", color: "var(--green)" },
  ];

  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= lines.length) return;
    const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 250 : 420);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 30px 80px -30px black, 0 0 0 1px color-mix(in oklch, var(--accent) 16%, transparent), 0 0 60px -20px color-mix(in oklch, var(--accent) 35%, transparent)",
    }}>
      {/* Terminal header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--line)",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: "color-mix(in oklch, var(--fg-3) 40%, transparent)" }} />
          ))}
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>~/resumes · zsh</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>● live</span>
      </div>

      {/* Lines */}
      <div className="mono" style={{ padding: "18px 18px 22px", fontSize: 12.5, lineHeight: 1.7, minHeight: 280 }}>
        {lines.slice(0, step).map((l, i) => (
          <div key={i} className="line-in" style={{ display: "flex", gap: 10 }}>
            <span style={{ color: l.p === "$" ? "var(--accent)" : "var(--fg-3)" }}>{l.p}</span>
            <span style={{ color: l.color }}>{l.c}</span>
          </div>
        ))}
        {step < lines.length && (
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: "var(--accent)" }}>$</span>
            <span className="caret" style={{ background: "var(--fg-0)", width: 8, height: 14, display: "inline-block" }} />
          </div>
        )}
        {step >= lines.length && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--line)", display: "flex", justifyContent: "space-between", color: "var(--fg-3)", fontSize: 11 }}>
            <span>3 patches available</span>
            <span>elapsed · 4.1s</span>
          </div>
        )}
      </div>
    </div>
  );
}
