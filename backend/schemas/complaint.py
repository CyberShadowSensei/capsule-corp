from typing import Optional
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ComplaintBase(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None

    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None

    complaint_description: Optional[str] = None
    complaint_type: Optional[str] = None
    date_of_complaint: Optional[str] = None

    severity: Optional[str] = None
    priority: Optional[str] = None
    ai_proposed_action: Optional[str] = None

    ai_suggested_severity: Optional[str] = None
    ai_suggested_priority: Optional[str] = None
    ai_rationale: Optional[str] = None

    status: Optional[str] = "open"
    job_id: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None

    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None

    complaint_description: Optional[str] = None
    complaint_type: Optional[str] = None
    date_of_complaint: Optional[str] = None

    severity: Optional[str] = None
    priority: Optional[str] = None
    ai_proposed_action: Optional[str] = None

    ai_suggested_severity: Optional[str] = None
    ai_suggested_priority: Optional[str] = None
    ai_rationale: Optional[str] = None

    status: Optional[str] = None
    job_id: Optional[str] = None


class ComplaintOut(ComplaintBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
