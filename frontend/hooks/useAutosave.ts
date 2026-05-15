"use client";

import { useEffect, useRef, useCallback } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { saveLocal, saveVersion, markSynced } from "@/lib/db";
import { api } from "@/lib/api";

const AUTOSAVE_DEBOUNCE_MS = 2000;
const SYNC_DEBOUNCE_MS = 8000;

export function useAutosave(resumeId: string | null) {
  const { resume, editor, markDirty } = useResumeStore();
  const localTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const lastSavedContent = useRef<string>("");

  const doLocalSave = useCallback(async () => {
    if (!resume || !resumeId) return;
    const contentStr = JSON.stringify(resume.content);
    if (contentStr === lastSavedContent.current) return;

    lastSavedContent.current = contentStr;

    await saveLocal({
      id: resumeId,
      title: resume.title,
      content: resume.content,
      raw_text: resume.raw_text ?? undefined,
      savedAt: Date.now(),
      synced: false,
    });

    await saveVersion(resumeId, resume.content, "Auto-save", resume.raw_text ?? undefined);
  }, [resume, resumeId]);

  const doServerSync = useCallback(async () => {
    if (!resume || !resumeId) return;
    try {
      await api.updateResume(resumeId, { content: resume.content });
      await markSynced(resumeId);
      markDirty(false);
    } catch {
      // Offline — will retry on next change
    }
  }, [resume, resumeId, markDirty]);

  // Trigger autosave whenever content changes
  useEffect(() => {
    if (!editor.isDirty || !resumeId) return;

    // Local save — fast (2s debounce)
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(doLocalSave, AUTOSAVE_DEBOUNCE_MS);

    // Server sync — slower (8s debounce)
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(doServerSync, SYNC_DEBOUNCE_MS);

    return () => {
      if (localTimer.current) clearTimeout(localTimer.current);
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [editor.isDirty, resume?.content, resumeId, doLocalSave, doServerSync]);

  // Save version before AI rewrite
  const saveBeforeAI = useCallback(async () => {
    if (!resume || !resumeId) return;
    await saveVersion(resumeId, resume.content, "Before AI rewrite", resume.raw_text ?? undefined);
  }, [resume, resumeId]);

  return { saveBeforeAI };
}
