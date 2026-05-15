"use client";

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 14, stroke = 1.5, className = "", style }: IconProps) {
  const s = size;
  const sw = stroke;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24" as const, fill: "none" as const,
    stroke: "currentColor", strokeWidth: sw,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    className, style,
  };
  switch (name) {
    case "sparkle":
      return <svg {...common}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l3 3M15.5 15.5l3 3M5.5 18.5l3-3M15.5 8.5l3-3"/></svg>;
    case "logo":
      return <svg width={s} height={s} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor"/><path d="M7 17V8h2l3 5 3-5h2v9h-2v-5l-3 5-3-5v5H7z" fill="var(--bg-0)"/></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "summary":
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h10"/></svg>;
    case "briefcase":
      return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/></svg>;
    case "cap":
      return <svg {...common}><path d="M3 9l9-4 9 4-9 4-9-4z"/><path d="M7 11v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4"/></svg>;
    case "wrench":
      return <svg {...common}><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z"/></svg>;
    case "code":
      return <svg {...common}><path d="M16 18l6-6-6-6M8 6l-6 6 6 6M14 4l-4 16"/></svg>;
    case "badge":
      return <svg {...common}><circle cx="12" cy="9" r="5"/><path d="M9 13l-2 8 5-3 5 3-2-8"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>;
    case "terminal":
      return <svg {...common}><path d="M4 5l5 7-5 7M11 19h9"/></svg>;
    case "diff":
      return <svg {...common}><path d="M9 4v16M5 8l4-4 4 4M15 20V4M19 16l-4 4-4-4"/></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.6 2.6a7 7 0 00-2 1.2L5.1 6 3 9.3l2 1.5a7 7 0 000 2.4l-2 1.5L5.1 18l2.3-.9a7 7 0 002 1.2L10 21h4l.6-2.6a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "check":
      return <svg {...common}><path d="M5 12l5 5L20 7"/></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "play":
      return <svg {...common}><path d="M6 4v16l14-8L6 4z" fill="currentColor"/></svg>;
    case "flame":
      return <svg {...common}><path d="M12 3s5 4 5 9-3 8-5 8-5-3-5-7 2-5 2-8 3-2 3-2z"/></svg>;
    case "download":
      return <svg {...common}><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>;
    case "dot":
      return <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>;
    case "branch":
      return <svg {...common}><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 7v10M6 13a6 6 0 006-6h2"/></svg>;
    case "doc":
      return <svg {...common}><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/></svg>;
    default:
      return null;
  }
}

type PillTone = "default" | "accent" | "green" | "red" | "amber" | "ghost";

interface PillProps {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
  icon?: React.ReactNode;
}

export function Pill({ children, tone = "default", className = "", icon }: PillProps) {
  const toneMap: Record<PillTone, { bg: string; fg: string; line: string }> = {
    default: { bg: "var(--bg-2)", fg: "var(--fg-1)", line: "var(--line-soft)" },
    accent:  { bg: "var(--accent-soft)", fg: "var(--accent)", line: "var(--accent-line)" },
    green:   { bg: "var(--green-soft)",  fg: "var(--green)",  line: "color-mix(in oklch, var(--green) 30%, transparent)" },
    red:     { bg: "var(--red-soft)",    fg: "var(--red)",    line: "color-mix(in oklch, var(--red) 30%, transparent)" },
    amber:   { bg: "var(--amber-soft)",  fg: "var(--amber)",  line: "color-mix(in oklch, var(--amber) 30%, transparent)" },
    ghost:   { bg: "transparent", fg: "var(--fg-2)", line: "var(--line)" },
  };
  const t = toneMap[tone];
  return (
    <span
      className={`mono ${className}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 7px",
        fontSize: 10.5,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        fontWeight: 600,
        background: t.bg, color: t.fg,
        border: `1px solid ${t.line}`,
        borderRadius: 999,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

interface DotProps {
  tone?: "accent" | "green" | "red" | "amber";
}

export function Dot({ tone = "accent" }: DotProps) {
  const c = tone === "green" ? "var(--green)" : tone === "red" ? "var(--red)" : tone === "amber" ? "var(--amber)" : "var(--accent)";
  return <span className="pulse-dot" style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: c }} />;
}
