import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Resume, ResumeContent, DiffPatch, ATSAnalysis, AIRewriteResult, AIActivity } from "@/types/resume";

interface AIState {
  isStreaming: boolean;
  pendingResult: AIRewriteResult | null;
  ghostText: string;
  reasoning: string;
  activities: AIActivity[];
}

interface EditorState {
  activeSection: string | null;
  isDirty: boolean;
}

interface ResumeStore {
  resume: Resume | null;
  ai: AIState;
  editor: EditorState;
  ats: ATSAnalysis | null;

  setResume: (r: Resume) => void;
  updateContent: (content: ResumeContent) => void;
  setAIStreaming: (v: boolean) => void;
  setPendingAIResult: (result: AIRewriteResult | null) => void;
  appendGhostToken: (token: string) => void;
  clearGhostText: () => void;
  addActivity: (activity: Omit<AIActivity, "timestamp">) => void;
  clearActivities: () => void;
  acceptAISuggestion: () => void;
  rejectAISuggestion: () => void;
  acceptPatch: (patch: DiffPatch) => void;
  setATS: (a: ATSAnalysis) => void;
  setActiveSection: (s: string | null) => void;
  markDirty: (v: boolean) => void;
}

export const useResumeStore = create<ResumeStore>()(
  immer((set) => ({
    resume: null,
    ai: { isStreaming: false, pendingResult: null, ghostText: "", reasoning: "", activities: [] },
    editor: { activeSection: null, isDirty: false },
    ats: null,

    setResume: (r) =>
      set((s) => {
        s.resume = r;
        s.ats = r.ats_analysis ?? null;
      }),

    updateContent: (content) =>
      set((s) => {
        if (s.resume) {
          s.resume.content = content;
          s.editor.isDirty = true;
        }
      }),

    setAIStreaming: (v) =>
      set((s) => {
        s.ai.isStreaming = v;
        if (v) s.ai.activities = [];
      }),

    setPendingAIResult: (result) =>
      set((s) => {
        s.ai.pendingResult = result;
        if (result) s.ai.reasoning = result.reasoning;
      }),

    appendGhostToken: (token) =>
      set((s) => {
        s.ai.ghostText += token;
      }),

    clearGhostText: () =>
      set((s) => {
        s.ai.ghostText = "";
      }),

    addActivity: (activity) =>
      set((s) => {
        s.ai.activities.push({ ...activity, timestamp: Date.now() });
      }),

    clearActivities: () =>
      set((s) => {
        s.ai.activities = [];
      }),

    acceptAISuggestion: () =>
      set((s) => {
        if (s.resume && s.ai.pendingResult) {
          s.resume.content = s.ai.pendingResult.suggested as ResumeContent;
          s.ai.pendingResult = null;
          s.ai.activities = [];
          s.editor.isDirty = true;
        }
      }),

    rejectAISuggestion: () =>
      set((s) => {
        s.ai.pendingResult = null;
        s.ai.reasoning = "";
        s.ai.activities = [];
      }),

    acceptPatch: (patch) =>
      set((s) => {
        if (!s.resume) return;
        const parts = patch.path.split(/\.|\[(\d+)\]/).filter(Boolean);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let node: any = s.resume.content;
        for (let i = 0; i < parts.length - 1; i++) {
          node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = patch.suggested;
        s.editor.isDirty = true;
      }),

    setATS: (a) =>
      set((s) => {
        s.ats = a;
        if (s.resume) s.resume.ats_score = a.score;
      }),

    setActiveSection: (sec) =>
      set((s) => {
        s.editor.activeSection = sec;
      }),

    markDirty: (v) =>
      set((s) => {
        s.editor.isDirty = v;
      }),
  }))
);
