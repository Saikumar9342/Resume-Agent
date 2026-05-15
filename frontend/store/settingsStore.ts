import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSize = "sm" | "md" | "lg";
export type EditorLayout = "split" | "wide" | "focus";
export type AIModel = "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";

interface SettingsStore {
  // Editor
  fontSize: FontSize;
  editorLayout: EditorLayout;
  showHeatmap: boolean;
  autoSave: boolean;
  // AI
  preferredModel: AIModel;
  streamingEnabled: boolean;
  // Notifications
  notifyOnSave: boolean;
  notifyOnATS: boolean;
  // Actions
  setFontSize: (v: FontSize) => void;
  setEditorLayout: (v: EditorLayout) => void;
  setShowHeatmap: (v: boolean) => void;
  setAutoSave: (v: boolean) => void;
  setPreferredModel: (v: AIModel) => void;
  setStreamingEnabled: (v: boolean) => void;
  setNotifyOnSave: (v: boolean) => void;
  setNotifyOnATS: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      fontSize: "md",
      editorLayout: "split",
      showHeatmap: true,
      autoSave: true,
      preferredModel: "claude-sonnet-4-6",
      streamingEnabled: true,
      notifyOnSave: false,
      notifyOnATS: true,
      setFontSize: (v) => set({ fontSize: v }),
      setEditorLayout: (v) => set({ editorLayout: v }),
      setShowHeatmap: (v) => set({ showHeatmap: v }),
      setAutoSave: (v) => set({ autoSave: v }),
      setPreferredModel: (v) => set({ preferredModel: v }),
      setStreamingEnabled: (v) => set({ streamingEnabled: v }),
      setNotifyOnSave: (v) => set({ notifyOnSave: v }),
      setNotifyOnATS: (v) => set({ notifyOnATS: v }),
    }),
    { name: "resume-agent-settings" }
  )
);
