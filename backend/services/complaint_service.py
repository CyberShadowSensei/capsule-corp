from typing import List

from sqlalchemy.orm import Session

from core.exceptions import ComplaintNotFoundError
from models.complaint import Complaint
from repositories import complaint_repository
from schemas.complaint import ComplaintCreate, ComplaintOut, ComplaintUpdate


def get_all(db: Session) -> List[Complaint]:
    return complaint_repository.get_all(db)


def get_by_id(db: Session, complaint_id: int) -> Complaint:
    complaint = complaint_repository.get_by_id(db, complaint_id)
    if complaint is None:
        raise ComplaintNotFoundError("Complaint not found")
    return complaint


def create(db: Session, data: ComplaintCreate) -> Complaint:
    return complaint_repository.create(db, data)


def update(db: Session, complaint_id: int, data: ComplaintUpdate) -> Complaint:
    complaint = complaint_repository.update(db, complaint_id, data)
    if complaint is None:
        raise ComplaintNotFoundError("Complaint not found")
    return complaint
