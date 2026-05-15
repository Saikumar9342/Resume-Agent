from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.resume import Resume
from app.models.schemas import ATSAnalyzeRequest, ATSAnalyzeResponse
from app.services.database import get_db
from app.services.ats import score_resume

router = APIRouter()


@router.post("/ats/analyze", response_model=ATSAnalyzeResponse)
async def analyze_ats(payload: ATSAnalyzeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == payload.resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    analysis = score_resume(resume.content or {}, payload.job_description)

    resume.ats_score = analysis["score"]
    resume.ats_analysis = analysis
    await db.commit()

    return ATSAnalyzeResponse(**analysis)
