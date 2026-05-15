from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.models.resume import Resume
from app.models.user import User
from app.models.schemas import ResumeCreate, ResumeResponse, RewriteRequest, RewriteResponse
from app.services.database import get_db
from app.services.auth import get_current_user
from app.services.diff import generate_diff_patches
from app.agents.pipeline import run_pipeline

router = APIRouter()


@router.post("/resumes", response_model=ResumeResponse)
async def create_resume(
    payload: ResumeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = Resume(
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        raw_text=payload.raw_text,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/resumes", response_model=list[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/resumes/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.patch("/resumes/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    allowed = {"title", "content", "raw_text"}
    for k, v in payload.items():
        if k in allowed:
            setattr(resume, k, v)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.delete("/resumes/{resume_id}")
async def delete_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    await db.delete(resume)
    await db.commit()
    return {"deleted": resume_id}


@router.post("/resumes/{resume_id}/rewrite", response_model=RewriteResponse)
async def rewrite_resume(
    resume_id: str,
    payload: RewriteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    raw_text = resume.raw_text or ""
    if not raw_text and resume.content:
        raw_text = json.dumps(resume.content)

    state = await run_pipeline(
        raw_text=raw_text,
        job_description=payload.job_description,
        section=payload.section,
        instructions=payload.instructions,
    )

    original = resume.content or state.get("structured", {})
    suggested = state.get("validated") or state.get("optimized") or {}
    patches = generate_diff_patches(original, suggested)

    return RewriteResponse(
        resume_id=resume_id,
        original=original,
        suggested=suggested,
        diff_patches=patches,
        reasoning=state.get("reasoning", ""),
    )
