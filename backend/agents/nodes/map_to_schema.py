"""
Node: map_to_schema
Normalizes extracted fields into the canonical Complaint shape.
Coerces enums, trims whitespace, ensures consistent date strings.
No LLM calls — pure deterministic transformation.
"""
import logging
from typing import Any, Dict, Optional

from agents.state import ComplaintState

logger = logging.getLogger(__name__)

VALID_SEVERITY = {"critical", "major", "minor"}
VALID_PRIORITY = {"high", "medium", "low"}


def _coerce_enum(value: Optional[str], valid_set: set) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in valid_set:
        return normalized.capitalize()
    return None


def _clean_string(value: Any) -> Optional[str]:
    if value is None:
        return None
    return str(value).strip() or None


def map_to_schema(state: ComplaintState) -> ComplaintState:
    logger.info("map_to_schema: job_id=%s", state.get("job_id"))

    if state.get("status") == "error":
        return state

    raw = state.get("extracted_fields") or {}

    mapped: Dict[str, Any] = {
        "customer_name": _clean_string(raw.get("customer_name")),
        "customer_email": _clean_string(raw.get("customer_email")),
        "company_name": _clean_string(raw.get("company_name")),
        "phone": _clean_string(raw.get("phone")),
        "product_name": _clean_string(raw.get("product_name")),
        "batch_number": _clean_string(raw.get("batch_number")),
        "manufacturing_date": _clean_string(raw.get("manufacturing_date")),
        "expiry_date": _clean_string(raw.get("expiry_date")),
        "complaint_description": _clean_string(raw.get("complaint_description")),
        "complaint_type": _clean_string(raw.get("complaint_type")),
        "date_of_complaint": _clean_string(raw.get("date_of_complaint")),
        "severity": _coerce_enum(raw.get("severity"), VALID_SEVERITY),
        "priority": _coerce_enum(raw.get("priority"), VALID_PRIORITY),
        "ai_proposed_action": _clean_string(raw.get("ai_proposed_action")),
    }

    state["mapped_complaint"] = mapped
    state["progress_percent"] = 70
    logger.info("map_to_schema: done job_id=%s", state.get("job_id"))
    return state
