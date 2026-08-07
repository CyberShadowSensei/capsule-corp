from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Customer Info
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    # Product Details
    product_name = Column(String, nullable=True)
    batch_number = Column(String, nullable=True)
    manufacturing_date = Column(String, nullable=True)
    expiry_date = Column(String, nullable=True)

    # Complaint Details
    complaint_description = Column(Text, nullable=True)
    complaint_type = Column(String, nullable=True)
    date_of_complaint = Column(String, nullable=True)

    # Risk Assessment
    severity = Column(String, nullable=True)  # Final severity (may be edited by QA)
    priority = Column(String, nullable=True)  # Final priority (may be edited by QA)
    ai_proposed_action = Column(Text, nullable=True)

    # AI audit trail (PRD 8.5) — preserve original AI classification for review
    ai_suggested_severity = Column(String, nullable=True)
    ai_suggested_priority = Column(String, nullable=True)
    ai_rationale = Column(Text, nullable=True)

    # Status and async job tracking
    status = Column(String, default="open", nullable=False)
    job_id = Column(String, nullable=True)
