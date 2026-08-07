from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.complaint import ComplaintCreate, ComplaintOut, ComplaintUpdate
from services import complaint_service
from core.security import get_current_user

router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])


@router.get("/", response_model=List[ComplaintOut])
def list_complaints(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return complaint_service.get_all(db)


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return complaint_service.get_by_id(db, complaint_id)


@router.post("/", response_model=ComplaintOut, status_code=201)
def create_complaint(data: ComplaintCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return complaint_service.create(db, data)


@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(complaint_id: int, data: ComplaintUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return complaint_service.update(db, complaint_id, data)
