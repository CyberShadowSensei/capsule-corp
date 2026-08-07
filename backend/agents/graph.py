"""
LangGraph complaint intake pipeline.
Graph: load_document -> extract_fields -> validate_fields
         -> (conditional) deep_reextract -> map_to_schema -> risk_assessment
         -> bonus nodes (summary, root_cause, capa_recommendation)

Each node updates state and progress_percent.
The graph is compiled once at module load time and reused across requests.
"""
import logging
from typing import Literal

from langgraph.graph import END, StateGraph

from agents.nodes.bonus_nodes import capa_recommendation, root_cause, summary
from agents.nodes.deep_reextract import deep_reextract
from agents.nodes.extract_fields import extract_fields
from agents.nodes.map_to_schema import map_to_schema
from agents.nodes.risk_assessment import risk_assessment
from agents.nodes.validate_fields import validate_fields
from agents.state import ComplaintState

logger = logging.getLogger(__name__)


def _load_document(state: ComplaintState) -> ComplaintState:
    """
    The document text is pre-loaded before graph invocation.
    This node simply marks the load step complete.
    """
    logger.info("load_document: job_id=%s raw_text_len=%d", state.get("job_id"), len(state.get("raw_text", "")))
    state["progress_percent"] = 10
    state["status"] = "running"
    return state


def _should_escalate(state: ComplaintState) -> Literal["deep_reextract", "map_to_schema"]:
    if state.get("needs_escalation"):
        logger.info("graph: escalating to deep_reextract job_id=%s", state.get("job_id"))
        return "deep_reextract"
    return "map_to_schema"


def _should_continue(state: ComplaintState) -> Literal["map_to_schema", END]:
    if state.get("status") == "error":
        return END
    return "map_to_schema"


def build_graph() -> StateGraph:
    builder = StateGraph(ComplaintState)

    builder.add_node("load_document", _load_document)
    builder.add_node("extract_fields", extract_fields)
    builder.add_node("validate_fields", validate_fields)
    builder.add_node("deep_reextract", deep_reextract)
    builder.add_node("map_to_schema", map_to_schema)
    builder.add_node("risk_assessment", risk_assessment)
    builder.add_node("summary", summary)
    builder.add_node("root_cause", root_cause)
    builder.add_node("capa_recommendation", capa_recommendation)

    builder.set_entry_point("load_document")
    builder.add_edge("load_document", "extract_fields")
    builder.add_edge("extract_fields", "validate_fields")
    builder.add_conditional_edges(
        "validate_fields",
        _should_escalate,
        {"deep_reextract": "deep_reextract", "map_to_schema": "map_to_schema"},
    )
    builder.add_conditional_edges(
        "deep_reextract",
        _should_continue,
        {"map_to_schema": "map_to_schema", END: END},
    )
    builder.add_edge("map_to_schema", "risk_assessment")
    builder.add_edge("risk_assessment", "summary")
    builder.add_edge("summary", "root_cause")
    builder.add_edge("root_cause", "capa_recommendation")
    builder.add_edge("capa_recommendation", END)

    return builder.compile()


# Compile once at import time
intake_graph = build_graph()
