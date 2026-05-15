from sqlalchemy import Column, String, Text, DateTime, JSON, Float, ForeignKey
from sqlalchemy.sql import func
import uuid

from app.services.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="Untitled Resume")
    content = Column(JSON, nullable=False, default=dict)
    raw_text = Column(Text, nullable=True)
    ats_score = Column(Float, nullable=True)
    ats_analysis = Column(JSON, nullable=True)
    version = Column(String(50), default="1.0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
