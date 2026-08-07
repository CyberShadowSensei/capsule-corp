"""
Node: extract_fields
Calls Groq gemma2-9b-it to extract complaint fields from plain text.
Validates the response against the ComplaintExtraction Pydantic schema.
Retries once with a corrective prompt on parse failure.
"""
import json
import logging
from typing import Any, Dict

from pydantic import BaseModel, ValidationError

from agents.llm_client import PRIMARY_MODEL, chat_completion
from agents.prompts.templates import EXTRACT_FIELDS_PROMPT
from agents.state import ComplaintState

logger = logging.getLogger(__name__)


class ComplaintExtraction(BaseModel):
    customer_name: str | None = None
    customer_email: str | None = None
    company_name: str | None = None
    phone: str | None = None
    product_name: str | None = None
    batch_number: str | None = None
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    complaint_description: str | None = None
    complaint_type: str | None = None
    date_of_complaint: str | None = None
    severity: str | None = None
    priority: str | None = None
    ai_proposed_action: str | None = None


def _parse_json(raw: str) -> Dict[str, Any]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def extract_fields(state: ComplaintState) -> ComplaintState:
    logger.info("extract_fields: job_id=%s", state.get("job_id"))
    document_text = state.get("raw_text", "")

    prompt = EXTRACT_FIELDS_PROMPT.format(document_text=document_text)
    messages = [{"role": "user", "content": prompt}]

    raw_output = chat_completion(messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})

    try:
        parsed = _parse_json(raw_output)
        extraction = ComplaintExtraction(**parsed)
        state["extracted_fields"] = extraction.model_dump()
        state["progress_percent"] = 45
        logger.info("extract_fields: success job_id=%s", state.get("job_id"))
    except (json.JSONDecodeError, ValidationError, Exception) as exc:
        logger.warning("extract_fields: parse failure, retrying. error=%s", exc)
        corrective_messages = messages + [
            {"role": "assistant", "content": raw_output},
            {
                "role": "user",
                "content": (
                    "The JSON you returned was invalid or did not match the schema. "
                    "Return ONLY a valid JSON object matching the schema, no markdown, no explanation."
                ),
            },
        ]
        retry_output = chat_completion(corrective_messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})
        try:
            parsed = _parse_json(retry_output)
            extraction = ComplaintExtraction(**parsed)
            state["extracted_fields"] = extraction.model_dump()
            state["progress_percent"] = 45
        except Exception as final_exc:
            logger.error("extract_fields: fatal parse failure job_id=%s error=%s", state.get("job_id"), final_exc)
            state["status"] = "error"
            state["error_message"] = f"Field extraction failed: {final_exc}"

    return state
