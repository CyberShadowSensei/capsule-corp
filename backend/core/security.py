from fastapi import Depends
from pydantic import BaseModel

class User(BaseModel):
    username: str
    role: str

def get_current_user() -> User:
    """
    Stub dependency for authentication.
    Returns a hardcoded demo QA user.
    """
    return User(username="demo_qa", role="qa_associate")
