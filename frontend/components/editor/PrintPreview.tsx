"use client";

import { useEffect, useState } from "react";
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

export function PrintPreview({ resume, title, template, onClose }: PrintPreviewProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "resume-print-root";
    document.body.appendChild(el);
    setContainer(el);

    const prevTitle = document.title;
    document.title = title || "resume";

    const onAfterPrint = () => onClose();
    window.addEventListener("afterprint", onAfterPrint);
    const t = setTimeout(() => window.print(), 150);

    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", onAfterPrint);
      if (document.body.contains(el)) document.body.removeChild(el);
      document.title = prevTitle;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = (
    <>
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body > *:not(#resume-print-root) { display: none !important; }
          #resume-print-root { display: block !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      {template === "minimal" && <MinimalTemplate resume={resume} />}
      {template === "classic" && <ClassicTemplate resume={resume} />}
      {template === "modern" && <ModernTemplate resume={resume} />}
      {template === "executive" && <ExecutiveTemplate resume={resume} />}
      {template === "compact" && <CompactTemplate resume={resume} />}
      {template === "creative" && <CreativeTemplate resume={resume} />}
    </>
  );

  if (!container) return null;
  return createPortal(content, container);
}
