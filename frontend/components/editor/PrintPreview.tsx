"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResumeContent } from "@/types/resume";
import type { TemplateId } from "./TemplatePicker";
import {
  MinimalTemplate, ClassicTemplate, ModernTemplate,
  ExecutiveTemplate, CompactTemplate, CreativeTemplate,
} from "./TemplatePicker";

interface PrintPreviewProps {
  resume: ResumeContent;
  title: string;
  template: TemplateId;
  onClose: () => void;
}

function TemplateRenderer({ resume, template }: { resume: ResumeContent; template: TemplateId }) {
  if (template === "minimal") return <MinimalTemplate resume={resume} />;
  if (template === "classic") return <ClassicTemplate resume={resume} />;
  if (template === "modern") return <ModernTemplate resume={resume} />;
  if (template === "executive") return <ExecutiveTemplate resume={resume} />;
  if (template === "compact") return <CompactTemplate resume={resume} />;
  if (template === "creative") return <CreativeTemplate resume={resume} />;
  return null;
}

export function PrintPreview({ resume, title, template, onClose }: PrintPreviewProps) {
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
    window.print();
  };

  useEffect(() => {
    const onAfterPrint = () => onClose();
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <>
      {/* Print-only styles — hides the modal overlay, shows only resume content */}
      <style>{`
        @media print {
          @page { margin: 12mm; size: A4; }
          body > *:not(#resume-print-root) { display: none !important; }
          #resume-print-root { display: block !important; position: static !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @media screen {
          #resume-print-root { display: none !important; }
        }
      `}</style>

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
          }}>
            <TemplateRenderer resume={resume} template={template} />
          </div>
        </div>
      </div>

      {/* Hidden print target — rendered into body so @media print can show it */}
      {printRootRef.current && createPortal(
        <TemplateRenderer resume={resume} template={template} />,
        printRootRef.current
      )}
    </>
  );

  return createPortal(modal, document.body);
}
