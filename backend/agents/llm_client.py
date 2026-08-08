import logging
import time
from typing import Any, Dict, Optional

from groq import Groq

from config import settings

logger = logging.getLogger(__name__)

# Model constants
PRIMARY_MODEL = "llama-3.1-8b-instant"
ESCALATION_MODEL = "llama-3.3-70b-versatile"

_client: Optional[Groq] = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def chat_completion(
    messages: list[Dict[str, Any]],
    model: str = PRIMARY_MODEL,
    response_format: Optional[Dict[str, str]] = None,
    max_retries: int = 2,
    timeout: float = 60.0,
) -> str:
    """
    Call the Groq chat completion API with bounded retries and timeout.
    Returns the content string of the first choice.
    Raises RuntimeError if all retries are exhausted.
    """
    client = _get_client()
    kwargs: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "timeout": timeout,
    }
    if response_format is not None:
        kwargs["response_format"] = response_format

    last_error: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            logger.info("Groq call attempt=%d model=%s", attempt + 1, model)
            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            logger.info("Groq call succeeded attempt=%d model=%s", attempt + 1, model)
            return content
        except Exception as exc:
            last_error = exc
            logger.warning("Groq call failed attempt=%d model=%s error=%s", attempt + 1, model, exc)
            if attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))

    raise RuntimeError(f"Groq call exhausted {max_retries + 1} attempts. Last error: {last_error}")
