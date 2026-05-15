from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class ResumeCreate(BaseModel):
    title: str = "Untitled Resume"
    content: dict = Field(default_factory=dict)
    raw_text: Optional[str] = None


class ResumeResponse(BaseModel):
    id: str
    title: str
    content: dict
    raw_text: Optional[str]
    ats_score: Optional[float]
    ats_analysis: Optional[dict]
    version: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RewriteRequest(BaseModel):
    section: Optional[str] = None
    job_description: Optional[str] = None
    instructions: Optional[str] = None


class RewriteResponse(BaseModel):
    resume_id: str
    original: dict
    suggested: dict
    diff_patches: list[dict]
    reasoning: str


class ATSAnalyzeRequest(BaseModel):
    resume_id: str
    job_description: Optional[str] = None


class ATSAnalyzeResponse(BaseModel):
    score: float
    checkpoints: list[dict]
    missing_keywords: list[str]
    suggestions: list[str]


class WSMessage(BaseModel):
    type: str
    payload: Any
