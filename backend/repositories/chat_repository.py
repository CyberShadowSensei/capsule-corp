"""
Chat repository: persist and retrieve chat messages per job.
"""
from typing import List
from sqlalchemy.orm import Session
from models.chat_message import ChatMessage

def add_message(db: Session, job_id: str, role: str, content: str) -> ChatMessage:
    msg = ChatMessage(job_id=job_id, role=role, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

def get_by_job_id(db: Session, job_id: str) -> List[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.job_id == job_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
