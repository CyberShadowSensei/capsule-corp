"""
Node: deep_reextract
Called when validate_fields sets needs_escalation=True.
Uses the escalation model (llama-3.3-70b-versatile) for a second pass.
"""
import json
import logging

from agents.llm_client import ESCALATION_MODEL, chat_completion
from agents.prompts.templates import EXTRACT_FIELDS_PROMPT
from agents.state import ComplaintState

logger = logging.getLogger(__name__)


def deep_reextract(state: ComplaintState) -> ComplaintState:
    logger.info("deep_reextract: escalating job_id=%s", state.get("job_id"))

    document_text = state.get("raw_text", "")
    prompt = EXTRACT_FIELDS_PROMPT.format(document_text=document_text)
    messages = [{"role": "user", "content": prompt}]

    raw_output = chat_completion(messages, model=ESCALATION_MODEL, response_format={"type": "json_object"})

    try:
        parsed = json.loads(raw_output.strip())
        # Merge: prefer non-null values from the deep extraction
        current = state.get("extracted_fields") or {}
        for key, value in parsed.items():
            if value is not None or current.get(key) is None:
                current[key] = value
        state["extracted_fields"] = current
        logger.info("deep_reextract: success job_id=%s", state.get("job_id"))
    except Exception as exc:
        logger.error("deep_reextract: parse failure job_id=%s error=%s", state.get("job_id"), exc)

    return state
