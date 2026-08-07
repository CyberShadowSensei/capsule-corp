from typing import List, Optional

from sqlalchemy.orm import Session

from models.complaint import Complaint
from schemas.complaint import ComplaintCreate, ComplaintUpdate


def get_all(db: Session) -> List[Complaint]:
    return db.query(Complaint).all()


def get_by_id(db: Session, complaint_id: int) -> Optional[Complaint]:
    return db.query(Complaint).filter(Complaint.id == complaint_id).first()


def create(db: Session, data: ComplaintCreate) -> Complaint:
    complaint = Complaint(**data.model_dump())
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


def update(db: Session, complaint_id: int, data: ComplaintUpdate) -> Optional[Complaint]:
    complaint = get_by_id(db, complaint_id)
    if complaint is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(complaint, field, value)
    db.commit()
    db.refresh(complaint)
    return complaint
