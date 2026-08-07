"""
Node: validate_fields
Calls Groq to assess completeness and confidence of extracted fields.
Sets needs_escalation=True if confidence is low or fields are missing.
"""
import json
import logging

from agents.llm_client import PRIMARY_MODEL, chat_completion
from agents.prompts.templates import VALIDATE_FIELDS_PROMPT
from agents.state import ComplaintState

logger = logging.getLogger(__name__)


def validate_fields(state: ComplaintState) -> ComplaintState:
    logger.info("validate_fields: job_id=%s", state.get("job_id"))

    if state.get("status") == "error":
        return state

    extracted_json = json.dumps(state.get("extracted_fields", {}), indent=2)
    prompt = VALIDATE_FIELDS_PROMPT.format(extracted_json=extracted_json)
    messages = [{"role": "user", "content": prompt}]

    raw_output = chat_completion(messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})

    try:
        result = json.loads(raw_output.strip())
        state["validation_result"] = result
        state["needs_escalation"] = result.get("needs_escalation", False)
        state["progress_percent"] = 60
        logger.info("validate_fields: completeness_score=%s job_id=%s", result.get("completeness_score"), state.get("job_id"))
    except Exception as exc:
        logger.warning("validate_fields: parse failure, defaulting to no escalation. error=%s", exc)
        state["validation_result"] = {}
        state["needs_escalation"] = False
        state["progress_percent"] = 60

    return state
