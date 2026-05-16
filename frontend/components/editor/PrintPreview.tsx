"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResumeContent, ResumeStyle } from "@/types/resume";
import type { TemplateId } from "./TemplatePicker";
import {
  MinimalTemplate, ClassicTemplate, ModernTemplate,
  ExecutiveTemplate, CompactTemplate, CreativeTemplate,
} from "./TemplatePicker";

// Map font-family stack to a Google Fonts import URL
const GOOGLE_FONT_URLS: Record<string, string> = {
  "Inter, sans-serif": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap",
  "'Roboto', Arial, sans-serif": "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap",
  "'Merriweather', Georgia, serif": "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap",
  "'Lato', Arial, sans-serif": "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",
  "'Source Sans 3', Arial, sans-serif": "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap",
  "'Playfair Display', Georgia, serif": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&display=swap",
};

interface PrintPreviewProps {
  resume: ResumeContent;
  title: string;
  template: TemplateId;
  resumeStyle?: ResumeStyle;
  onClose: () => void;
}

function TemplateRenderer({ resume, template, resumeStyle }: { resume: ResumeContent; template: TemplateId; resumeStyle?: ResumeStyle }) {
  if (template === "minimal") return <MinimalTemplate resume={resume} resumeStyle={resumeStyle} />;
  if (template === "classic") return <ClassicTemplate resume={resume} resumeStyle={resumeStyle} />;
  if (template === "modern") return <ModernTemplate resume={resume} resumeStyle={resumeStyle} />;
  if (template === "executive") return <ExecutiveTemplate resume={resume} resumeStyle={resumeStyle} />;
  if (template === "compact") return <CompactTemplate resume={resume} resumeStyle={resumeStyle} />;
  if (template === "creative") return <CreativeTemplate resume={resume} resumeStyle={resumeStyle} />;
  return null;
}

export function PrintPreview({ resume, title, template, resumeStyle, onClose }: PrintPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const printRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);

    // Create a hidden div for the actual print target
    const el = document.createElement("div");
    el.id = "resume-print-root";
    el.style.display = "none";
    document.body.appendChild(el);
    printRootRef.current = el;

    const prevTitle = document.title;
    document.title = title || "resume";

    return () => {
      if (document.body.contains(el)) document.body.removeChild(el);
      document.title = prevTitle;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    const printRoot = printRootRef.current;
    if (!printRoot) return;

    const fontUrl = resumeStyle ? GOOGLE_FONT_URLS[resumeStyle.fontFamily] : null;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      ${fontUrl ? `<link rel="stylesheet" href="${fontUrl}">` : ""}
      <style>
        @page { margin: 12mm 0; size: A4; }
        html, body { margin: 0; padding: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        ul { padding-left: 16px; }
        li { list-style: disc; }
      </style>
    </head><body>${printRoot.innerHTML}</body></html>`);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        onClose();
      }, 1000);
    };
  };

  if (!mounted) return null;

  const modal = (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          html, body { margin: 0; padding: 0; height: auto !important; overflow: visible !important; }
          body > *:not(#resume-print-root) { display: none !important; }
          #resume-print-root {
            display: block !important;
            position: static !important;
            width: 210mm !important;
            margin: 0 auto !important;
            overflow: visible !important;
            height: auto !important;
          }
          #resume-print-root * {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          #resume-print-root > div {
            padding-top: 12mm !important;
            padding-bottom: 12mm !important;
            box-sizing: border-box !important;
          }
          ul, li { list-style: disc !important; }
          ul { padding-left: 16px !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media screen {
          #resume-print-root { display: none !important; }
        }
      `}</style>
      {/* Inject Google Font for the chosen font family so PDF matches screen */}
      {resumeStyle && GOOGLE_FONT_URLS[resumeStyle.fontFamily] && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={GOOGLE_FONT_URLS[resumeStyle.fontFamily]} />
      )}

      {/* Modal overlay */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.72)",
          display: "flex", flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Toolbar */}
        <div style={{
          width: "100%", flexShrink: 0,
          background: "var(--bg-1)", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", gap: 12,
        }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>
            Print preview — <span style={{ color: "var(--fg-0)" }}>{title || "resume"}</span>
            <span style={{ color: "var(--fg-4)", marginLeft: 8 }}>{template}</span>
            <span style={{ color: "var(--fg-4)", marginLeft: 16, fontSize: 11 }}>tip: check "Background graphics" in print dialog for colors</span>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              className="btn btn-ghost mono"
              style={{ height: 32, fontSize: 12 }}
            >
              ✕ close
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-accent mono"
              style={{ height: 32, fontSize: 12, padding: "0 16px" }}
            >
              🖨 print / save PDF
            </button>
          </div>
        </div>

        {/* Scrollable preview area */}
        <div style={{
          flex: 1, overflow: "auto", width: "100%",
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "32px 24px 48px",
        }}>
          {/* A4 paper simulation */}
          <div style={{
            width: 794,
            minWidth: 794,
            background: "#fff",
            boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
            borderRadius: 2,
            overflow: "visible",
          }}>
            <TemplateRenderer resume={resume} template={template} resumeStyle={resumeStyle} />
          </div>
        </div>
      </div>

      {/* Hidden print target — rendered into body so @media print can show it */}
      {printRootRef.current && createPortal(
        <TemplateRenderer resume={resume} template={template} resumeStyle={resumeStyle} />,
        printRootRef.current
      )}
    </>
  );

  return createPortal(modal, document.body);
}
