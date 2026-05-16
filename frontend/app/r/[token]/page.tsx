"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ResumeContent } from "@/types/resume";
import { ClassicTemplate } from "@/components/editor/TemplatePicker";

interface ShareData {
  title: string;
  content: ResumeContent;
  ats_score?: number;
}

export default function SharedResumePage() {
  const params = useParams();
  const token = params?.token as string;
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/r/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "var(--font-geist-sans, sans-serif)", color: "#888",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>◎</div>
        <div style={{ fontSize: 13 }}>Loading resume…</div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "var(--font-geist-sans, sans-serif)",
    }}>
      <div style={{ textAlign: "center", color: "#666" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>404</div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>Resume not found</div>
        <div style={{ fontSize: 12, color: "#aaa" }}>This link may have expired or been removed.</div>
      </div>
    </div>
  );

  const name = data.content?.contact?.name ?? data.title ?? "Resume";

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 0 48px" }}>
      {/* Header bar */}
      <div style={{
        maxWidth: 860, margin: "0 auto 20px", padding: "0 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontFamily: "var(--font-geist-sans, sans-serif)" }}>
          <div style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>
            Shared via <span style={{ color: "#5046e5", fontWeight: 600 }}>Resume Agent</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {data.ats_score != null && (
            <div style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: 11.5, padding: "4px 12px", borderRadius: 99,
              background: data.ats_score >= 80 ? "#dcfce7" : data.ats_score >= 60 ? "#fef9c3" : "#fee2e2",
              color: data.ats_score >= 80 ? "#16a34a" : data.ats_score >= 60 ? "#ca8a04" : "#dc2626",
              fontWeight: 700,
            }}>
              ATS {data.ats_score}/100
            </div>
          )}
          <button
            onClick={() => window.print()}
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: 11.5, padding: "5px 14px", borderRadius: 6,
              background: "#fff", border: "1px solid #ddd",
              color: "#444", cursor: "pointer",
            }}
          >
            ↓ save PDF
          </button>
        </div>
      </div>

      {/* Resume card */}
      <div style={{
        maxWidth: 860, margin: "0 auto",
        background: "#fff",
        boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
        borderRadius: 8,
        overflow: "hidden",
      }}>
        <ClassicTemplate resume={data.content} />
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: 860, margin: "20px auto 0", padding: "0 20px",
        textAlign: "center",
        fontFamily: "var(--font-geist-sans, sans-serif)",
        fontSize: 11.5, color: "#aaa",
      }}>
        Built with{" "}
        <a href="/" style={{ color: "#5046e5", textDecoration: "none", fontWeight: 600 }}>
          Resume Agent
        </a>
        {" "}— AI-native resume editor
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body > *:not(#root) { display: none !important; }
          .resume-card { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
