"""
Intake service: orchestrates the LangGraph pipeline and persists results.
Background tasks call run_pipeline / run_pipeline_text.
"""
import json
import logging
from typing import Optional

from database import SessionLocal
from agents.graph import intake_graph
from agents.llm_client import PRIMARY_MODEL, chat_completion
from models.intake_job import IntakeJob
from repositories import intake_repository, chat_repository
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def create_job(db: Session, job_id: str, source_type: str, source_filename: Optional[str] = None) -> IntakeJob:
    return intake_repository.create(db, job_id=job_id, source_type=source_type, source_filename=source_filename)


def _extract_text(raw_bytes: bytes, filename: str) -> str:
    """
    Extract plain text from pdf/docx/txt/eml.
    Uses pypdf, python-docx, or stdlib email; basic extraction per PRD §8.7 note.
    """
    import os
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".txt":
        return raw_bytes.decode("utf-8", errors="replace")

    if ext == ".pdf":
        import io
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(raw_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            logger.warning("pypdf not installed, returning raw bytes as text")
            return raw_bytes.decode("utf-8", errors="replace")

    if ext == ".docx":
        import io
        try:
            import docx
            doc = docx.Document(io.BytesIO(raw_bytes))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            logger.warning("python-docx not installed, returning raw bytes as text")
            return raw_bytes.decode("utf-8", errors="replace")

    if ext == ".eml":
        import email
        msg = email.message_from_bytes(raw_bytes)
        parts = []
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                parts.append(part.get_payload(decode=True).decode("utf-8", errors="replace"))
        return "\n".join(parts)

    return raw_bytes.decode("utf-8", errors="replace")


def _run_graph(job_id: str, raw_text: str) -> None:
    """Run the LangGraph pipeline and persist updates to the DB."""
    db = SessionLocal()
    try:
        intake_repository.update_status(db, job_id, status="running", progress_percent=5)

        initial_state = {
            "job_id": job_id,
            "raw_text": raw_text,
            "status": "pending",
            "progress_percent": 0,
            "needs_escalation": False,
        }

        final_state = intake_graph.invoke(initial_state)

        if final_state.get("status") == "error":
            intake_repository.update_status(
                db,
                job_id,
                status="error",
                progress_percent=final_state.get("progress_percent", 0),
                error_message=final_state.get("error_message"),
            )
            return

        job = intake_repository.get_by_job_id(db, job_id)
        existing_payload = job.extracted_payload or {} if job else {}
        existing_mapped = existing_payload.get("mapped_complaint", {})
        new_mapped = final_state.get("mapped_complaint") or {}

        merged_mapped = dict(existing_mapped)
        conflicts = []

        for field, new_value in new_mapped.items():
            old_value = existing_mapped.get(field)
            if not old_value:
                if new_value:
                    merged_mapped[field] = new_value
            elif old_value and new_value and old_value != new_value:
                conflicts.append((field, old_value, new_value))

        if conflicts and job:
            for field, old_value, new_value in conflicts:
                msg = f"I noticed the new document mentions {field} is {new_value}, but the form says {old_value}. Which should I keep?"
                chat_repository.add_message(db, job_id=job_id, role="assistant", content=msg)

        payload = {
            "mapped_complaint": merged_mapped,
            "severity": final_state.get("severity"),
            "priority": final_state.get("priority"),
            "rationale": final_state.get("rationale"),
            "ai_proposed_action": final_state.get("ai_proposed_action"),
            "summary": final_state.get("summary"),
            "root_causes": final_state.get("root_causes"),
            "capa": final_state.get("capa"),
            "ai_suggested_severity": final_state.get("severity"),
            "ai_suggested_priority": final_state.get("priority"),
            "ai_rationale": final_state.get("rationale"),
        }

        intake_repository.update_status(
            db,
            job_id,
            status="complete",
            progress_percent=100,
            extracted_payload=payload,
        )
        logger.info("intake_service: pipeline complete job_id=%s", job_id)

    except Exception as exc:
        logger.error("intake_service: pipeline exception job_id=%s error=%s", job_id, exc)
        intake_repository.update_status(db, job_id, status="error", progress_percent=0, error_message=str(exc))
    finally:
        db.close()


def run_pipeline(job_id: str, raw_bytes: bytes, filename: str) -> None:
    raw_text = _extract_text(raw_bytes, filename)
    _run_graph(job_id, raw_text)


def run_pipeline_text(job_id: str, text: str) -> None:
    _run_graph(job_id, text)


def chat(db: Session, job_id: str, message: str, current_fields: Optional[dict] = None) -> dict:
    """
    Handle a chat message. Detects intent (log / edit / qa) and returns structured fields
    when the user is logging or editing a complaint, plain response otherwise.
    """
    from agents.prompts.templates import (
        INTENT_DETECTION_PROMPT,
        CHAT_EXTRACT_PROMPT,
        RISK_ASSESSMENT_PROMPT,
    )

    job = intake_repository.get_by_job_id(db, job_id)
    if job is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")

    chat_repository.add_message(db, job_id=job_id, role="user", content=message)

    existing_payload = job.extracted_payload or {}
    existing_fields = existing_payload.get("mapped_complaint") or current_fields or {}
    context_str = json.dumps(existing_payload, indent=2)

    # Step 1: detect intent
    intent_messages = [
        {"role": "user", "content": INTENT_DETECTION_PROMPT.format(
            context=context_str, message=message
        )}
    ]
    try:
        intent_raw = chat_completion(intent_messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})
        intent_data = json.loads(intent_raw)
        intent = intent_data.get("intent", "qa")
    except Exception as exc:
        logger.warning("Intent detection failed, defaulting to qa: %s", exc)
        intent = "qa"

    # Step 2: if log or edit, extract structured fields
    if intent in ("log", "edit"):
        extract_messages = [
            {"role": "user", "content": CHAT_EXTRACT_PROMPT.format(
                existing_fields=json.dumps(existing_fields, indent=2),
                message=message,
            )}
        ]
        try:
            extract_raw = chat_completion(extract_messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})
            extracted = json.loads(extract_raw)
        except Exception as exc:
            logger.warning("Field extraction failed in chat: %s", exc)
            extracted = existing_fields

        # Run risk assessment on the newly extracted fields
        risk_messages = [
            {"role": "user", "content": RISK_ASSESSMENT_PROMPT.format(
                complaint_json=json.dumps(extracted, indent=2)
            )}
        ]
        try:
            risk_raw = chat_completion(risk_messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})
            risk = json.loads(risk_raw)
            extracted["severity"] = risk.get("severity", extracted.get("severity"))
            extracted["priority"] = risk.get("priority", extracted.get("priority"))
            rationale = risk.get("rationale", "")
            extracted["ai_proposed_action"] = risk.get("ai_proposed_action", extracted.get("ai_proposed_action"))
            
            # Audit trail
            extracted["ai_suggested_severity"] = risk.get("severity")
            extracted["ai_suggested_priority"] = risk.get("priority")
            extracted["ai_rationale"] = rationale
        except Exception as exc:
            logger.warning("Risk assessment failed in chat: %s", exc)
            rationale = ""

        response = extracted.pop("response", "I've updated the complaint details!")
        chat_repository.add_message(db, job_id=job_id, role="assistant", content=response)
        
        return {
            "intent": intent,
            "fields": extracted,
            "rationale": rationale,
            "response": response,
        }

    # Step 3: plain Q&A
    qa_messages = [
        {
            "role": "system",
            "content": (
                "You are an AI assistant helping a pharmaceutical QA associate review a customer complaint. "
                "Answer questions using only the complaint context provided. "
                "If information is not in the context, say so. "
                "AI responses may contain errors; always verify critical information. "
                "If the context is empty, proactively introduce yourself and guide the user."
            ),
        },
        {"role": "user", "content": f"Complaint context:\n{context_str}\n\nQuestion: {message}"},
    ]
    response_text = chat_completion(qa_messages, model=PRIMARY_MODEL)
    chat_repository.add_message(db, job_id=job_id, role="assistant", content=response_text)
    return {"intent": "qa", "fields": None, "rationale": None, "response": response_text}


def generate_title(db: Session, job_id: str) -> str:
    from agents.prompts.templates import TITLE_GENERATION_PROMPT
    from fastapi import HTTPException
    
    job = intake_repository.get_by_job_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    messages = chat_repository.get_by_job_id(db, job_id)
    if not messages:
        return "New Complaint"
        
    conversation = "\n".join([f"{m.role}: {m.content}" for m in messages])
    
    prompt = TITLE_GENERATION_PROMPT.format(conversation=conversation)
    title = chat_completion([{"role": "user", "content": prompt}], model=PRIMARY_MODEL)
    title = title.strip('\'"').strip()
    
    intake_repository.update_title(db, job_id, title)
    return title
