"""
IntakeJob model: tracks an async extraction pipeline run.
Each upload/paste creates one row, updated as LangGraph nodes complete.
"""
from sqlalchemy import Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.sql import func

from database import Base


class IntakeJob(Base):
    __tablename__ = "intake_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    job_id = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    status = Column(String, default="pending", nullable=False)  # pending | running | complete | error
    progress_percent = Column(Integer, default=0, nullable=False)

    source_type = Column(String, nullable=True)   # upload | paste
    source_filename = Column(String, nullable=True)

    raw_text = Column(Text, nullable=True)
    extracted_payload = Column(JSON, nullable=True)  # evolving extraction state persisted per node
    error_message = Column(Text, nullable=True)

    # Linked complaint (set after successful extraction + save)
    complaint_id = Column(Integer, nullable=True)
