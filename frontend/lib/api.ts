import type { Resume, ResumeContent, AIRewriteResult, ATSAnalysis } from "@/types/resume";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("resume-agent-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: { id: string; email: string; full_name?: string };
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────
  register: (email: string, password: string, full_name?: string) =>
    request<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ id: string; email: string; full_name?: string }>("/api/v1/auth/me"),

  // ── Resumes ───────────────────────────────────────────────────
  listResumes: () => request<Resume[]>("/api/v1/resumes"),

  createResume: (title: string, rawText?: string) =>
    request<Resume>("/api/v1/resumes", {
      method: "POST",
      body: JSON.stringify({ title, raw_text: rawText, content: {} }),
    }),

  getResume: (id: string) => request<Resume>(`/api/v1/resumes/${id}`),

  updateResume: (id: string, patch: Partial<{ title: string; content: ResumeContent; raw_text: string }>) =>
    request<Resume>(`/api/v1/resumes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteResume: (id: string) =>
    request<{ deleted: string }>(`/api/v1/resumes/${id}`, { method: "DELETE" }),

  // ── Google Drive ──────────────────────────────────────────────
  getDriveAuthUrl: () => request<{ url: string }>("/api/v1/drive/auth-url"),

  saveToDrive: (access_token: string, filename: string, html: string) =>
    request<{ file_id: string; name: string }>("/api/v1/drive/save", {
      method: "POST",
      body: JSON.stringify({ access_token, filename, html }),
    }),

  rewriteResume: (id: string, opts: { section?: string; job_description?: string; instructions?: string }) =>
    request<AIRewriteResult>(`/api/v1/resumes/${id}/rewrite`, {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  // ── ATS ───────────────────────────────────────────────────────
  analyzeATS: (resumeId: string, jobDescription?: string) =>
    request<ATSAnalysis>("/api/v1/ats/analyze", {
      method: "POST",
      body: JSON.stringify({ resume_id: resumeId, job_description: jobDescription }),
    }),
};

export function getWsUrl(resumeId: string): string {
  const token = getToken();
  const base = BASE.replace(/^http/, "ws");
  return `${base}/ws/resume/${resumeId}${token ? `?token=${token}` : ""}`;
}
