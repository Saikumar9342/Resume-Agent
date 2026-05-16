import Dexie, { type Table } from "dexie";
import type { ResumeContent } from "@/types/resume";

export interface LocalResume {
  id: string;
  title: string;
  content: ResumeContent;
  raw_text?: string;
  savedAt: number;
  synced: boolean;
}

export interface ResumeVersion {
  id?: number;       // auto-increment
  resumeId: string;
  content: ResumeContent;
  raw_text?: string;
  savedAt: number;
  label: string;     // "Auto-save", "Before AI rewrite", etc.
  atsScore?: number;
}

class ResumeDB extends Dexie {
  resumes!: Table<LocalResume>;
  versions!: Table<ResumeVersion>;

  constructor() {
    super("ResumeAgentDB");
    this.version(1).stores({
      resumes: "id, savedAt, synced",
      versions: "++id, resumeId, savedAt",
    });
    this.version(2).stores({
      resumes: "id, savedAt, synced",
      versions: "++id, resumeId, savedAt",
    });
  }
}

export const db = new ResumeDB();

// ── Resume CRUD ──────────────────────────────────────────────

export async function saveLocal(resume: LocalResume) {
  await db.resumes.put({ ...resume, savedAt: Date.now(), synced: false });
}

export async function loadLocal(id: string): Promise<LocalResume | undefined> {
  return db.resumes.get(id);
}

export async function markSynced(id: string) {
  await db.resumes.update(id, { synced: true });
}

// ── Version history ──────────────────────────────────────────

export async function saveVersion(
  resumeId: string,
  content: ResumeContent,
  label: string,
  raw_text?: string,
  atsScore?: number
) {
  // Keep max 20 versions per resume
  const existing = await db.versions
    .where("resumeId")
    .equals(resumeId)
    .sortBy("savedAt");

  if (existing.length >= 20) {
    // Delete oldest
    await db.versions.delete(existing[0].id!);
  }

  await db.versions.add({
    resumeId,
    content,
    raw_text,
    savedAt: Date.now(),
    label,
    atsScore,
  });
}

export async function getVersions(resumeId: string): Promise<ResumeVersion[]> {
  return db.versions
    .where("resumeId")
    .equals(resumeId)
    .reverse()
    .sortBy("savedAt");
}

export async function restoreVersion(versionId: number): Promise<ResumeVersion | undefined> {
  return db.versions.get(versionId);
}
