"""
LLM provider with quota-aware fallback chain (all free models).

Chain order:
  1. gemini-2.0-flash          — 15 RPM / 1500 RPD  (Google AI Studio free)
  2. groq/llama-3.3-70b        — 30 RPM / 14400 RPD (Groq free tier)
  3. groq/llama-3.1-8b         — 30 RPM              (Groq free tier, lighter)
  4. gemini-2.0-flash-lite      — 30 RPM / 1500 RPD  (Google, cheaper)
  5. ollama/llama3.2            — unlimited local

Error strategy:
  - 429 / quota exhausted  → cooldown 60s, skip to next
  - 404 NOT_FOUND          → permanently skip (wrong API version for key)
  - 503 / transient        → retry same model 2x with backoff
  - other                  → skip to next immediately
"""

import asyncio
import time
import logging
from typing import Optional
from langchain_core.messages import BaseMessage
from app.config import settings

logger = logging.getLogger(__name__)

COOLDOWN_SECONDS = 60
MAX_RETRIES = 2
RETRY_BACKOFF = [2, 5]

_exhausted_until: dict[str, float] = {}
_permanently_skip: set[str] = set()


def _is_exhausted(model_id: str) -> bool:
    return time.monotonic() < _exhausted_until.get(model_id, 0)


def _mark_exhausted(model_id: str):
    _exhausted_until[model_id] = time.monotonic() + COOLDOWN_SECONDS
    logger.warning(f"[LLM] {model_id} rate-limited, cooling down {COOLDOWN_SECONDS}s")


def _mark_permanent_skip(model_id: str, reason: str):
    _permanently_skip.add(model_id)
    logger.warning(f"[LLM] {model_id} permanently skipped: {reason}")


def _build_gemini(model: str):
    from langchain_google_genai import ChatGoogleGenerativeAI
    if not settings.google_api_key:
        return None
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.google_api_key,
        temperature=0,
        request_timeout=60,
    )


def _build_groq(model: str = "llama-3.3-70b-versatile"):
    try:
        from langchain_groq import ChatGroq
        key = getattr(settings, "groq_api_key", "") or ""
        if not key:
            return None
        return ChatGroq(model=model, api_key=key, temperature=0)
    except ImportError:
        return None


def _build_ollama():
    try:
        from langchain_ollama import ChatOllama
        return ChatOllama(model="llama3.2", temperature=0)
    except ImportError:
        return None


_CHAIN = [
    ("gemini-2.0-flash",       lambda: _build_gemini("gemini-2.0-flash")),
    ("groq/llama-3.3-70b",     lambda: _build_groq("llama-3.3-70b-versatile")),
    ("groq/llama-3.1-8b",      lambda: _build_groq("llama-3.1-8b-instant")),
    ("gemini-2.0-flash-lite",  lambda: _build_gemini("gemini-2.0-flash-lite")),
    ("ollama/llama3.2",        _build_ollama),
]


def _is_quota_error(e: Exception) -> bool:
    s = str(e).lower()
    return "resource_exhausted" in s or "429" in s or "quota" in s or "rate_limit" in s


def _is_not_found(e: Exception) -> bool:
    s = str(e).lower()
    return "404" in s or "not_found" in s or "not found" in s


def _is_transient(e: Exception) -> bool:
    s = str(e).lower()
    return "503" in s or "timeout" in s or "connection" in s or "unavailable" in s


async def llm_stream(messages: list[BaseMessage]):
    """
    Stream tokens from the best available LLM. Yields str chunks.
    Falls back through the chain if a model is unavailable.
    """
    last_error = None

    for model_id, factory in _CHAIN:
        if model_id in _permanently_skip:
            continue
        if _is_exhausted(model_id):
            continue

        llm = factory()
        if llm is None:
            continue

        try:
            logger.info(f"[LLM stream] {model_id}")
            async for chunk in llm.astream(messages):
                content = chunk.content if hasattr(chunk, "content") else str(chunk)
                if content:
                    yield content
            return
        except Exception as e:
            last_error = e
            if _is_quota_error(e):
                _mark_exhausted(model_id)
            elif _is_not_found(e):
                _mark_permanent_skip(model_id, "404 not found")
            logger.warning(f"[LLM stream] {model_id} failed → next: {e}")

    raise RuntimeError(f"All LLM providers failed (stream). Last error: {last_error}")


async def llm_invoke(messages: list[BaseMessage], active_model_out: Optional[list] = None) -> str:
    """
    Invoke the best available LLM with automatic fallback.
    Returns the response content string.
    """
    last_error = None

    for model_id, factory in _CHAIN:
        if model_id in _permanently_skip:
            continue
        if _is_exhausted(model_id):
            logger.debug(f"[LLM] Skipping {model_id} (cooldown)")
            continue

        llm = factory()
        if llm is None:
            continue

        for attempt in range(MAX_RETRIES + 1):
            try:
                logger.info(f"[LLM] {model_id} (attempt {attempt + 1})")
                response = await llm.ainvoke(messages)
                if active_model_out is not None:
                    if active_model_out:
                        active_model_out[0] = model_id
                    else:
                        active_model_out.append(model_id)
                logger.info(f"[LLM] ✓ {model_id}")
                return response.content

            except Exception as e:
                last_error = e
                if _is_quota_error(e):
                    _mark_exhausted(model_id)
                    break
                elif _is_not_found(e):
                    _mark_permanent_skip(model_id, "404 not found for this API key")
                    break
                elif _is_transient(e) and attempt < MAX_RETRIES:
                    wait = RETRY_BACKOFF[attempt]
                    logger.warning(f"[LLM] {model_id} transient, retry in {wait}s")
                    await asyncio.sleep(wait)
                else:
                    logger.warning(f"[LLM] {model_id} failed → next: {e}")
                    break

    raise RuntimeError(
        f"All LLM providers failed. Last error: {last_error}"
    )
