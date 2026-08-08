from typing import Optional

from sqlalchemy.orm import Session

from models.intake_job import IntakeJob


def get_by_job_id(db: Session, job_id: str) -> Optional[IntakeJob]:
    return db.query(IntakeJob).filter(IntakeJob.job_id == job_id).first()


def get_all(db: Session):
    return db.query(IntakeJob).order_by(IntakeJob.created_at.desc()).all()


def create(db: Session, job_id: str, source_type: str, source_filename: Optional[str] = None) -> IntakeJob:
    job = IntakeJob(job_id=job_id, source_type=source_type, source_filename=source_filename)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_status(db: Session, job_id: str, status: str, progress_percent: int, extracted_payload: Optional[dict] = None, error_message: Optional[str] = None) -> Optional[IntakeJob]:
    job = get_by_job_id(db, job_id)
    if job is None:
        return None
    job.status = status
    job.progress_percent = progress_percent
    if extracted_payload is not None:
        job.extracted_payload = extracted_payload
    job.error_message = error_message
    db.commit()
    db.refresh(job)
    return job


def update_title(db: Session, job_id: str, title: str) -> Optional[IntakeJob]:
    job = get_by_job_id(db, job_id)
    if job is None:
        return None
    job.title = title
    db.commit()
    db.refresh(job)
    return job
