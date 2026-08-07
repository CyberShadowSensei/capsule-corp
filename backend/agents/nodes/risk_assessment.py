"""
Node: risk_assessment
Calls Groq to determine severity, priority, and a natural-language rationale.
A bare severity label with no rationale is never acceptable output.
"""
import json
import logging

from agents.llm_client import PRIMARY_MODEL, chat_completion
from agents.prompts.templates import RISK_ASSESSMENT_PROMPT
from agents.state import ComplaintState

logger = logging.getLogger(__name__)


def risk_assessment(state: ComplaintState) -> ComplaintState:
    logger.info("risk_assessment: job_id=%s", state.get("job_id"))

    if state.get("status") == "error":
        return state

    complaint_json = json.dumps(state.get("mapped_complaint") or state.get("extracted_fields") or {}, indent=2)
    prompt = RISK_ASSESSMENT_PROMPT.format(complaint_json=complaint_json)
    messages = [{"role": "user", "content": prompt}]

    raw_output = chat_completion(messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})

    try:
        result = json.loads(raw_output.strip())
        state["severity"] = result.get("severity")
        state["priority"] = result.get("priority")
        state["rationale"] = result.get("rationale")
        state["ai_proposed_action"] = result.get("ai_proposed_action")
        state["progress_percent"] = 90
        logger.info("risk_assessment: severity=%s priority=%s job_id=%s", state.get("severity"), state.get("priority"), state.get("job_id"))
    except Exception as exc:
        logger.error("risk_assessment: parse failure job_id=%s error=%s", state.get("job_id"), exc)
        state["status"] = "error"
        state["error_message"] = f"Risk assessment failed: {exc}"

    return state
