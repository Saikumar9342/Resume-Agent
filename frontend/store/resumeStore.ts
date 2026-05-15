import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Resume, ResumeContent, DiffPatch, ATSAnalysis, AIRewriteResult, AIActivity } from "@/types/resume";

interface AIState {
  isStreaming: boolean;
  streamingSection: string | null;
  sectionTokens: Record<string, string>;
  pendingResult: AIRewriteResult | null;
  ghostText: string;
  reasoning: string;
  activities: AIActivity[];
  activeModel: string | null;
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

  setResume: (r: Resume | null) => void;
  updateContent: (content: ResumeContent) => void;
  setResumeTitle: (title: string) => void;
  setAIStreaming: (v: boolean) => void;
  setActiveModel: (model: string) => void;
  setStreamingSection: (section: string | null) => void;
  appendSectionToken: (section: string, token: string) => void;
  commitSection: (section: string, content: unknown) => void;
  setPendingAIResult: (result: AIRewriteResult | null) => void;
  appendGhostToken: (token: string) => void;
  clearGhostText: () => void;
  addActivity: (activity: Omit<AIActivity, "timestamp">) => void;
  clearActivities: () => void;
  acceptAISuggestion: () => void;
  rejectAISuggestion: () => void;
  acceptPatch: (patch: DiffPatch) => void;
  setATS: (a: ATSAnalysis | null) => void;
  setActiveSection: (s: string | null) => void;
  markDirty: (v: boolean) => void;
}

export const useResumeStore = create<ResumeStore>()(
  immer((set) => ({
    resume: null,
    ai: {
      isStreaming: false,
      streamingSection: null,
      sectionTokens: {},
      pendingResult: null,
      ghostText: "",
      reasoning: "",
      activities: [],
      activeModel: null,
    },
    editor: { activeSection: null, isDirty: false },
    ats: null,

    setResume: (r) =>
      set((s) => {
        s.resume = r;
        s.ats = r?.ats_analysis ?? null;
      }),

    updateContent: (content) =>
      set((s) => {
        if (s.resume) {
          s.resume.content = content;
          s.editor.isDirty = true;
        }
      }),

    setResumeTitle: (title) =>
      set((s) => {
        if (s.resume) {
          s.resume.title = title;
          s.editor.isDirty = true;
        }
      }),

    setActiveModel: (model) =>
      set((s) => {
        s.ai.activeModel = model;
      }),

    setAIStreaming: (v) =>
      set((s) => {
        s.ai.isStreaming = v;
        if (v) {
          s.ai.activities = [];
          s.ai.sectionTokens = {};
          s.ai.streamingSection = null;
        }
      }),

    setStreamingSection: (section) =>
      set((s) => {
        s.ai.streamingSection = section;
        if (section && !s.ai.sectionTokens[section]) {
          s.ai.sectionTokens[section] = "";
        }
      }),

    appendSectionToken: (section, token) =>
      set((s) => {
        s.ai.sectionTokens[section] = (s.ai.sectionTokens[section] ?? "") + token;
      }),

    commitSection: (section, content) =>
      set((s) => {
        // Write the final content into resume immediately
        if (s.resume) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s.resume.content as any)[section] = content;
        }
        s.ai.streamingSection = null;
        delete s.ai.sectionTokens[section];
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
        // Parse "experience[0].bullets[9]" → ["experience", 0, "bullets", 9]
        const parts: (string | number)[] = [];
        const re = /([^.[]+)|\[(\d+)\]/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(patch.path)) !== null) {
          if (m[1] !== undefined) parts.push(m[1]);
          else if (m[2] !== undefined) parts.push(Number(m[2]));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let node: any = s.resume.content;
        for (let i = 0; i < parts.length - 1; i++) {
          if (node == null) return;
          node = node[parts[i]];
        }
        if (node == null) return;
        node[parts[parts.length - 1]] = patch.suggested;
        s.editor.isDirty = true;
      }),

    setATS: (a) =>
      set((s) => {
        s.ats = a;
        if (s.resume && a) s.resume.ats_score = a.score;
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
