"use client";

import { useCallback, useEffect } from "react";
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
import { motion } from "framer-motion";
import { useResumeStore } from "@/store/resumeStore";

const theme = {
  heading: {
    h1: "text-2xl font-bold text-slate-900 mb-1",
    h2: "text-lg font-semibold text-slate-700 mt-4 mb-1 border-b border-slate-200 pb-1",
  },
  list: {
    ul: "list-disc ml-4 space-y-1",
    ol: "list-decimal ml-4 space-y-1",
    listitem: "text-slate-700 text-sm leading-relaxed",
  },
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline",
  },
  paragraph: "text-slate-700 text-sm leading-relaxed mb-1",
};

const editorConfig = {
  namespace: "ResumeEditor",
  theme,
  onError: (error: Error) => console.error("[Lexical]", error),
  nodes: [HeadingNode, ListNode, ListItemNode],
};

interface ResumeEditorProps {
  initialText?: string;
  onTextChange?: (text: string) => void;
}

export function ResumeEditor({ initialText, onTextChange }: ResumeEditorProps) {
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      {/* AI streaming indicator */}
      {ai.isStreaming && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        />
      )}

      <LexicalComposer initialConfig={editorConfig}>
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[600px] p-8 outline-none focus:ring-0 prose prose-slate max-w-none"
                aria-label="Resume editor"
              />
            }
            placeholder={
              <div className="absolute top-8 left-8 text-slate-400 text-sm pointer-events-none select-none">
                Start typing your resume, or paste your existing resume to get started...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin onChange={handleChange} />

          {/* Ghost text overlay */}
          {ai.ghostText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-4 left-8 right-8 text-slate-400 text-sm italic pointer-events-none select-none"
            >
              {ai.ghostText}
              <span className="ml-1 text-violet-400 text-xs">[Tab to accept]</span>
            </motion.div>
          )}
        </div>
      </LexicalComposer>
    </motion.div>
  );
}
