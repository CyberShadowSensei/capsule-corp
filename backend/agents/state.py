"""
State schema for the LangGraph complaint intake pipeline.
All nodes read from and write to this typed dict.
"""
from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class ComplaintState(TypedDict, total=False):
    # Input
    job_id: str
    raw_text: str  # Plain text extracted from the document

    # Intermediate
    extracted_fields: Optional[Dict[str, Any]]  # Output of extract_fields node
    validation_result: Optional[Dict[str, Any]]  # Output of validate_fields node
    mapped_complaint: Optional[Dict[str, Any]]   # Output of map_to_schema node

    # Risk
    severity: Optional[str]
    priority: Optional[str]
    rationale: Optional[str]
    ai_proposed_action: Optional[str]

    # Bonus node outputs (feature-flagged)
    summary: Optional[str]
    root_causes: Optional[Dict[str, Any]]
    capa: Optional[Dict[str, Any]]
    duplicate_ids: Optional[List[int]]

    # Pipeline control
    needs_escalation: bool
    progress_percent: int
    status: str             # pending | running | complete | error
    error_message: Optional[str]
