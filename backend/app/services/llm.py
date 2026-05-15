"""
LLM provider with quota-aware fallback chain.

Priority (all free):
  1. gemini-2.0-flash       — 15 RPM / 1500 RPD
  2. gemini-1.5-flash       — 15 RPM / 1500 RPD (separate quota bucket)
  3. gemini-1.5-flash-8b    — 15 RPM / 4000 RPD
  4. groq/llama-3.3-70b-versatile — 30 RPM (requires GROQ_API_KEY)
  5. ollama/llama3.2        — local, unlimited (requires Ollama running)

Retry logic per model:
  - 429 RESOURCE_EXHAUSTED → mark model exhausted for COOLDOWN_SECONDS, try next
  - 503 / network error    → retry same model up to MAX_RETRIES with backoff
  - Any other error        → try next model immediately
"""

import asyncio
import time
import logging
from typing import Optional
from langchain_core.messages import BaseMessage
from app.config import settings

logger = logging.getLogger(__name__)

COOLDOWN_SECONDS = 60        # how long to skip a model after 429
MAX_RETRIES = 2              # retries on transient errors before moving on
RETRY_BACKOFF = [2, 5]      # seconds between retries

# Track per-model exhaustion timestamps
_exhausted_until: dict[str, float] = {}


def _is_exhausted(model_id: str) -> bool:
    until = _exhausted_until.get(model_id, 0)
    return time.monotonic() < until


def _mark_exhausted(model_id: str):
    _exhausted_until[model_id] = time.monotonic() + COOLDOWN_SECONDS
    logger.warning(f"[LLM] {model_id} marked exhausted for {COOLDOWN_SECONDS}s")


def _build_gemini(model: str):
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.google_api_key,
        temperature=0,
        request_timeout=60,
    )


def _build_groq():
    """Groq: free tier, llama-3.3-70b. Requires GROQ_API_KEY in .env"""
    try:
        from langchain_groq import ChatGroq
        groq_key = getattr(settings, "groq_api_key", "") or ""
        if not groq_key:
            return None
        return ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=groq_key,
            temperature=0,
        )
    except ImportError:
        return None


def _build_ollama():
    """Ollama: local model, always free. Falls back gracefully if not running."""
    try:
        from langchain_ollama import ChatOllama
        return ChatOllama(model="llama3.2", temperature=0)
    except ImportError:
        try:
            from langchain_community.chat_models import ChatOllama as LegacyOllama
            return LegacyOllama(model="llama3.2", temperature=0)
        except ImportError:
            return None


# Ordered fallback chain: (model_id, factory_fn)
_CHAIN = [
    ("gemini-2.0-flash",    lambda: _build_gemini("gemini-2.0-flash")),
    ("gemini-1.5-flash",    lambda: _build_gemini("gemini-1.5-flash")),
    ("gemini-1.5-flash-8b", lambda: _build_gemini("gemini-1.5-flash-8b")),
    ("groq/llama-3.3-70b",  _build_groq),
    ("ollama/llama3.2",     _build_ollama),
]


def _is_quota_error(e: Exception) -> bool:
    s = str(e).lower()
    return "resource_exhausted" in s or "429" in s or "quota" in s or "rate_limit" in s


def _is_transient(e: Exception) -> bool:
    s = str(e).lower()
    return "503" in s or "timeout" in s or "connection" in s or "unavailable" in s


async def llm_invoke(messages: list[BaseMessage], active_model_out: Optional[list] = None) -> str:
    """
    Invoke the best available LLM with automatic fallback.
    Returns the response text.
    active_model_out: if provided, first element is set to the model_id that succeeded.
    """
    last_error = None

    for model_id, factory in _CHAIN:
        if _is_exhausted(model_id):
            logger.debug(f"[LLM] Skipping {model_id} (still in cooldown)")
            continue

        llm = factory()
        if llm is None:
            logger.debug(f"[LLM] Skipping {model_id} (not available)")
            continue

        for attempt in range(MAX_RETRIES + 1):
            try:
                logger.debug(f"[LLM] Trying {model_id} (attempt {attempt + 1})")
                response = await llm.ainvoke(messages)
                if active_model_out is not None:
                    if active_model_out:
                        active_model_out[0] = model_id
                    else:
                        active_model_out.append(model_id)
                logger.debug(f"[LLM] Success with {model_id}")
                return response.content

            except Exception as e:
                last_error = e
                if _is_quota_error(e):
                    _mark_exhausted(model_id)
                    break  # move to next model immediately
                elif _is_transient(e) and attempt < MAX_RETRIES:
                    wait = RETRY_BACKOFF[attempt]
                    logger.warning(f"[LLM] {model_id} transient error, retrying in {wait}s: {e}")
                    await asyncio.sleep(wait)
                else:
                    logger.warning(f"[LLM] {model_id} failed, trying next: {e}")
                    break  # non-quota, non-transient → try next model

    raise RuntimeError(
        f"All LLM providers exhausted or unavailable. Last error: {last_error}"
    )
