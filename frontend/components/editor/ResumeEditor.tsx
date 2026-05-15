"use client";

import { useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { HeadingNode } from "@lexical/rich-text";
import { $getRoot, EditorState } from "lexical";
import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";

const theme = {
  heading: {
    h1: "text-[22px] font-bold text-slate-900 mb-1 tracking-tight",
    h2: "text-[13px] font-semibold text-violet-700 uppercase tracking-widest mt-6 mb-2 pb-1.5 border-b border-slate-100",
  },
  list: {
    ul: "list-none ml-0 space-y-1.5 mt-1",
    ol: "list-decimal ml-5 space-y-1",
    listitem: "text-slate-600 text-sm leading-relaxed pl-3 relative before:content-['–'] before:absolute before:left-0 before:text-slate-300",
  },
  text: {
    bold: "font-semibold text-slate-800",
    italic: "italic text-slate-600",
    underline: "underline",
  },
  paragraph: "text-slate-600 text-sm leading-relaxed mb-0.5",
};

const editorConfig = {
  namespace: "ResumeEditor",
  theme,
  onError: (error: Error) => console.error("[Lexical]", error),
  nodes: [HeadingNode, ListNode, ListItemNode],
};

interface ResumeEditorProps {
  onTextChange?: (text: string) => void;
}

export function ResumeEditor({ onTextChange }: ResumeEditorProps) {
  const { ai } = useResumeStore();

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent();
        onTextChange?.(text);
      });
    },
    [onTextChange]
  );

  return (
    <div className="relative">
      {/* AI streaming progress bar */}
      <AnimatePresence>
        {ai.isStreaming && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 h-0.5 origin-left z-10"
            style={{
              background: "linear-gradient(90deg, #7c3aed, #6366f1, #7c3aed)",
              backgroundSize: "200% 100%",
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <LexicalComposer initialConfig={editorConfig}>
        <div className="relative lexical-editor">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[520px] px-10 py-8 outline-none text-sm leading-relaxed"
                aria-label="Resume content editor"
              />
            }
            placeholder={
              <div className="absolute top-8 left-10 text-slate-400 text-sm leading-relaxed pointer-events-none select-none space-y-1">
                <p className="font-semibold text-slate-300 text-[15px]">John Smith</p>
                <p className="text-xs text-slate-300">john@email.com · LinkedIn · GitHub</p>
                <p className="text-xs text-violet-300 font-semibold uppercase tracking-widest mt-4">Experience</p>
                <p className="text-slate-300">– Led development of...</p>
                <p className="text-slate-300">– Increased performance by...</p>
                <p className="text-xs mt-3 text-slate-400 italic">Start typing or paste your resume above</p>
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin onChange={handleChange} />

          {/* Ghost text */}
          <AnimatePresence>
            {ai.ghostText && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-5 left-10 right-10 flex items-center gap-2"
              >
                <span className="text-sm text-slate-300 italic">{ai.ghostText}</span>
                <span className="text-xs px-1.5 py-0.5 bg-violet-50 text-violet-400 rounded border border-violet-100 font-mono shrink-0">
                  Tab
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </LexicalComposer>
    </div>
  );
}
