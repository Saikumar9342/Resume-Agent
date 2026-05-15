export interface ResumeContact {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
}

export interface ResumeExperience {
  company: string;
  title: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export interface ResumeSkills {
  technical: string[];
  soft: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url: string;
}

export interface ResumeContent {
  contact: ResumeContact;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: ResumeSkills;
  certifications: string[];
  projects: ResumeProject[];
}

export interface Resume {
  id: string;
  title: string;
  content: ResumeContent;
  raw_text?: string;
  ats_score?: number;
  ats_analysis?: ATSAnalysis;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface DiffPatch {
  path: string;
  original: string;
  suggested: string;
  diff: string;
  type: "modified" | "added";
}

export interface ATSCheckpoint {
  id: string;
  label: string;
  passed: boolean;
}

export interface ATSAnalysis {
  score: number;
  checkpoints: ATSCheckpoint[];
  missing_keywords: string[];
  suggestions: string[];
}

export interface AIRewriteResult {
  resume_id: string;
  original: ResumeContent;
  suggested: ResumeContent;
  diff_patches: DiffPatch[];
  reasoning: string;
}

export interface AIActivity {
  node: "extraction" | "analysis" | "optimization" | "validation";
  message: string;
  timestamp: number;
}

export type WSMessageType =
  | "patch"
  | "ai_stream_start"
  | "ai_suggestion"
  | "ai_activity"
  | "ai_cancelled"
  | "ai_error"
  | "section_stream_start"
  | "section_token"
  | "section_done"
  | "ghost_token"
  | "ghost_done"
  | "ats_update"
  | "pong";

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
}
