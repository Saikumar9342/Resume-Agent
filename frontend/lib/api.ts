import type { Resume, ResumeContent, AIRewriteResult, ATSAnalysis } from "@/types/resume";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createResume: (title: string, rawText?: string) =>
    request<Resume>("/api/v1/resumes", {
      method: "POST",
      body: JSON.stringify({ title, raw_text: rawText, content: {} }),
    }),

  getResume: (id: string) => request<Resume>(`/api/v1/resumes/${id}`),

  updateResume: (id: string, patch: Partial<{ title: string; content: ResumeContent }>) =>
    request<Resume>(`/api/v1/resumes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  rewriteResume: (
    id: string,
    opts: { section?: string; job_description?: string; instructions?: string }
  ) =>
    request<AIRewriteResult>(`/api/v1/resumes/${id}/rewrite`, {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  analyzeATS: (resumeId: string, jobDescription?: string) =>
    request<ATSAnalysis>("/api/v1/ats/analyze", {
      method: "POST",
      body: JSON.stringify({ resume_id: resumeId, job_description: jobDescription }),
    }),
};
