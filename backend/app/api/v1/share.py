from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.resume import Resume
from app.services.database import get_db

router = APIRouter()


@router.get("/r/{token}")
async def get_shared_resume(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.share_token == token))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"title": resume.title, "content": resume.content}
