"""
Custom exception hierarchy for the Complaint Management System.
All domain exceptions inherit from AppError so a single handler can catch them.
"""
from typing import Any, Optional


class AppError(Exception):
    """Base exception for all application errors."""
    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.details = details


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ComplaintNotFoundError(NotFoundError):
    code = "complaint_not_found"


class IntakeJobNotFoundError(NotFoundError):
    code = "intake_job_not_found"


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


class PipelineError(AppError):
    status_code = 500
    code = "pipeline_error"
