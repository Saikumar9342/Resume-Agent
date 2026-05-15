from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.resume import Resume
from app.models.user import User
from app.models.schemas import ATSAnalyzeRequest, ATSAnalyzeResponse
from app.services.database import get_db
from app.services.auth import get_current_user
from app.services.ats import score_resume

router = APIRouter()


@router.post("/ats/analyze", response_model=ATSAnalyzeResponse)
async def analyze_ats(
    payload: ATSAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    analysis = score_resume(resume.content or {}, payload.job_description)

    resume.ats_score = analysis["score"]
    resume.ats_analysis = analysis
    await db.commit()

    return ATSAnalyzeResponse(**analysis)
