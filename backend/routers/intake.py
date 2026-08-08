"""
Intake router: file upload and paste endpoints + SSE streaming + chat.
"""
import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator, Optional, Dict, Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.exceptions import IntakeJobNotFoundError, ValidationError as AppValidationError

import os
from config import settings
from database import get_db
from models.intake_job import IntakeJob
from repositories import intake_repository, chat_repository
from services import intake_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/intake", tags=["intake"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".eml"}


class PasteRequest(BaseModel):
    text: str
    job_id: Optional[str] = None



class ChatRequest(BaseModel):
    message: str
    current_fields: Optional[Dict[str, Any]] = None
    job_id: Optional[str] = None


@router.post("/upload")
def upload_complaint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    job_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise AppValidationError(f"File type not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    # Validate file size (sync since file was already spooled, but wait, fastapi UploadFile read() is async)
    # Actually, in def, file.file.read() should be used instead of await file.read()
    content = file.file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise AppValidationError(f"File exceeds {settings.MAX_UPLOAD_MB}MB limit")

    if job_id:
        job = intake_repository.get_by_job_id(db, job_id)
        if not job:
            job = intake_service.create_job(db, job_id=job_id, source_type="upload", source_filename=file.filename)
        else:
            job.status = "pending"
            job.progress_percent = 0
            job.source_type = "upload"
            job.source_filename = file.filename
            db.commit()
    else:
        job_id = str(uuid.uuid4())
        job = intake_service.create_job(db, job_id=job_id, source_type="upload", source_filename=file.filename)

    background_tasks.add_task(intake_service.run_pipeline, job_id=job_id, raw_bytes=content, filename=file.filename)

    return {"job_id": job_id, "status": "pending"}


@router.post("/paste")
def paste_complaint(
    request: PasteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not request.text.strip():
        raise AppValidationError("Text cannot be empty")

    job_id = request.job_id
    if job_id:
        job = intake_repository.get_by_job_id(db, job_id)
        if not job:
            intake_service.create_job(db, job_id=job_id, source_type="paste")
        else:
            job.status = "pending"
            job.progress_percent = 0
            job.source_type = "paste"
            db.commit()
    else:
        job_id = str(uuid.uuid4())
        intake_service.create_job(db, job_id=job_id, source_type="paste")

    background_tasks.add_task(intake_service.run_pipeline_text, job_id=job_id, text=request.text)

    return {"job_id": job_id, "status": "pending"}


@router.get("/")
def get_all_jobs(db: Session = Depends(get_db)):
    jobs = intake_repository.get_all(db)
    return [
        {
            "job_id": job.job_id,
            "created_at": job.created_at,
            "status": job.status,
            "source_type": job.source_type,
            "source_filename": job.source_filename,
        }
        for job in jobs
    ]


@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = intake_repository.get_by_job_id(db, job_id)
    if job is None:
        raise IntakeJobNotFoundError("Job not found")
    messages = chat_repository.get_by_job_id(db, job_id)
    return {
        "job_id": job.job_id,
        "status": job.status,
        "progress_percent": job.progress_percent,
        "extracted_payload": job.extracted_payload,
        "error_message": job.error_message,
        "chat_messages": [{"role": m.role, "content": m.content} for m in messages],
    }


@router.get("/{job_id}/stream")
async def stream_job(job_id: str, db: Session = Depends(get_db)):
    """
    SSE endpoint: emits one event per poll cycle with current job state.
    Client subscribes and receives progress updates without losing state on refresh.
    """
    job = intake_repository.get_by_job_id(db, job_id)
    if job is None:
        raise IntakeJobNotFoundError("Job not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        max_polls = 120  # 120 * 0.5s = 60 seconds max
        for _ in range(max_polls):
            # Re-query for fresh state each cycle
            fresh_job = intake_repository.get_by_job_id(db, job_id)
            if fresh_job is None:
                break

            event_data = json.dumps({
                "job_id": job_id,
                "status": fresh_job.status,
                "progress_percent": fresh_job.progress_percent,
                "extracted_payload": fresh_job.extracted_payload,
                "error_message": fresh_job.error_message,
            })
            yield f"data: {event_data}\n\n"

            if fresh_job.status in ("complete", "error"):
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _handle_chat(job_id: Optional[str], request: ChatRequest, db: Session):
    actual_job_id = job_id or request.job_id
    if not actual_job_id:
        actual_job_id = str(uuid.uuid4())
        intake_service.create_job(db, job_id=actual_job_id, source_type="pasted_text")
    
    result = intake_service.chat(db, job_id=actual_job_id, message=request.message, current_fields=request.current_fields)
    
    if isinstance(result, dict):
        result["job_id"] = actual_job_id
    return result

@router.post("/chat")
def chat_stateless(request: ChatRequest, db: Session = Depends(get_db)):
    return _handle_chat(None, request, db)

@router.post("/{job_id}/chat")
def chat_with_job_id(job_id: str, request: ChatRequest, db: Session = Depends(get_db)):
    return _handle_chat(job_id, request, db)
