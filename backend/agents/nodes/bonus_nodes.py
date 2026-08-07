"""
Bonus nodes: summary, root_cause, capa_recommendation
Each is feature-flagged via environment variables in config.py.
"""
import json
import logging

from agents.llm_client import PRIMARY_MODEL, chat_completion
from agents.prompts.templates import CAPA_PROMPT, ROOT_CAUSE_PROMPT, SUMMARY_PROMPT
from agents.state import ComplaintState
from config import settings

logger = logging.getLogger(__name__)


def summary(state: ComplaintState) -> ComplaintState:
    if not settings.FEATURE_SUMMARY or state.get("status") == "error":
        return state
    logger.info("summary: job_id=%s", state.get("job_id"))
    complaint_json = json.dumps(state.get("mapped_complaint") or {}, indent=2)
    prompt = SUMMARY_PROMPT.format(complaint_json=complaint_json)
    messages = [{"role": "user", "content": prompt}]
    try:
        result = chat_completion(messages, model=PRIMARY_MODEL)
        state["summary"] = result.strip()
    except Exception as exc:
        logger.warning("summary: failed, skipping. error=%s", exc)
    return state


def root_cause(state: ComplaintState) -> ComplaintState:
    if not settings.FEATURE_ROOT_CAUSE or state.get("status") == "error":
        return state
    logger.info("root_cause: job_id=%s", state.get("job_id"))
    complaint_json = json.dumps(state.get("mapped_complaint") or {}, indent=2)
    prompt = ROOT_CAUSE_PROMPT.format(complaint_json=complaint_json)
    messages = [{"role": "user", "content": prompt}]
    try:
        raw = chat_completion(messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})
        state["root_causes"] = json.loads(raw.strip())
    except Exception as exc:
        logger.warning("root_cause: failed, skipping. error=%s", exc)
    return state


def capa_recommendation(state: ComplaintState) -> ComplaintState:
    if not settings.FEATURE_CAPA or state.get("status") == "error":
        return state
    logger.info("capa_recommendation: job_id=%s", state.get("job_id"))
    context = {
        "complaint": state.get("mapped_complaint") or {},
        "root_causes": state.get("root_causes") or {},
    }
    context_json = json.dumps(context, indent=2)
    prompt = CAPA_PROMPT.format(context_json=context_json)
    messages = [{"role": "user", "content": prompt}]
    try:
        raw = chat_completion(messages, model=PRIMARY_MODEL, response_format={"type": "json_object"})
        state["capa"] = json.loads(raw.strip())
    except Exception as exc:
        logger.warning("capa_recommendation: failed, skipping. error=%s", exc)
    return state
