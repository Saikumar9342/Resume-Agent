"""
WebSocket handler for /ws/resume/{id}.
Messages sent to client:
  ai_stream_start       — pipeline began
  ai_activity           — node status log line
  section_stream_start  — {section: str} — about to stream this section
  section_token         — {section: str, token: str} — word-by-word
  section_done          — {section: str, content: any} — final value for section
  ai_suggestion         — full result + diff patches
  ai_cancelled          — user cancelled
  ai_error              — pipeline failed
"""

import asyncio
import re
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Optional
from app.services.auth import decode_token
from app.agents.pipeline import run_pipeline
from app.services.diff import generate_diff_patches
from app.services.llm import llm_invoke
from langchain_core.messages import HumanMessage

_connections: Dict[str, set] = {}


async def ws_connect(resume_id: str, ws: WebSocket, token: Optional[str] = None):
    if token:
        payload = decode_token(token)
        if not payload:
            await ws.close(code=4001)
            return
    await ws.accept()
    _connections.setdefault(resume_id, set()).add(ws)
    try:
        await _handle(resume_id, ws)
    except WebSocketDisconnect:
        pass
    finally:
        _connections[resume_id].discard(ws)


async def _stream_section(ws: WebSocket, section: str, content: str, delay: float = 0.03):
    """Stream a section's text word-by-word to the client."""
    await ws.send_json({"type": "section_stream_start", "payload": {"section": section}})
    words = re.split(r'(\s+)', content)
    for word in words:
        if word:
            await ws.send_json({"type": "section_token", "payload": {"section": section, "token": word}})
            await asyncio.sleep(delay)


async def _run_ai(ws: WebSocket, raw_text: str, job_desc: Optional[str], section: Optional[str], instructions: Optional[str] = None):
    await ws.send_json({"type": "ai_stream_start", "payload": {}})

    async def on_activity(node: str, message: str, model: str = ""):
        await ws.send_json({"type": "ai_activity", "payload": {"node": node, "message": message, "model": model}})

    # Run full pipeline (extraction + analysis + optimization + validation)
    state = await run_pipeline(
        raw_text=raw_text,
        job_description=job_desc,
        section=section,
        instructions=instructions,
        on_activity=on_activity,
    )

    final = state.get("validated") or state.get("optimized") or {}
    structured = state.get("structured", {})

    # Stream each section word-by-word in order
    sections_order = ["summary", "experience", "education", "skills", "projects"]

    for sec in sections_order:
        val = final.get(sec)
        if not val:
            continue

        if sec == "summary" and isinstance(val, str):
            await _stream_section(ws, sec, val)
            await ws.send_json({"type": "section_done", "payload": {"section": sec, "content": val}})

        elif sec == "experience" and isinstance(val, list):
            await ws.send_json({"type": "section_stream_start", "payload": {"section": sec}})
            for i, job in enumerate(val):
                bullets = job.get("bullets", [])
                streamed_bullets = []
                for bullet in bullets:
                    words = re.split(r'(\s+)', bullet)
                    token_buf = ""
                    for word in words:
                        if word:
                            token_buf += word
                            await ws.send_json({"type": "section_token", "payload": {"section": sec, "token": word}})
                            await asyncio.sleep(0.025)
                    streamed_bullets.append(bullet)
                val[i] = {**job, "bullets": streamed_bullets}
            await ws.send_json({"type": "section_done", "payload": {"section": sec, "content": val}})

        elif sec == "skills":
            tech = val.get("technical", []) if isinstance(val, dict) else []
            await ws.send_json({"type": "section_stream_start", "payload": {"section": sec}})
            for skill in tech:
                await ws.send_json({"type": "section_token", "payload": {"section": sec, "token": skill}})
                await asyncio.sleep(0.06)
            await ws.send_json({"type": "section_done", "payload": {"section": sec, "content": val}})

        elif sec == "projects" and isinstance(val, list):
            await ws.send_json({"type": "section_stream_start", "payload": {"section": sec}})
            for proj in val:
                desc = proj.get("description", "")
                for word in re.split(r'(\s+)', desc):
                    if word:
                        await ws.send_json({"type": "section_token", "payload": {"section": sec, "token": word}})
                        await asyncio.sleep(0.03)
            await ws.send_json({"type": "section_done", "payload": {"section": sec, "content": val}})

        elif sec == "education" and isinstance(val, list):
            await ws.send_json({"type": "section_stream_start", "payload": {"section": sec}})
            await asyncio.sleep(0.2)
            await ws.send_json({"type": "section_done", "payload": {"section": sec, "content": val}})

    # Also send contact if changed
    contact = final.get("contact")
    if contact:
        await ws.send_json({"type": "section_done", "payload": {"section": "contact", "content": contact}})

    # Final full suggestion + diff patches
    patches = generate_diff_patches(structured or {}, final or {})
    await ws.send_json({
        "type": "ai_suggestion",
        "payload": {
            "suggested": final,
            "diff_patches": patches,
            "reasoning": state.get("reasoning", ""),
        },
    })


async def _handle(resume_id: str, ws: WebSocket):
    ai_task: Optional[asyncio.Task] = None

    async for data in ws.iter_json():
        msg_type = data.get("type")
        payload = data.get("payload", {})

        if msg_type == "patch":
            dead = set()
            for other in _connections.get(resume_id, set()):
                if other is ws:
                    continue
                try:
                    await other.send_json({"type": "patch", "payload": payload})
                except Exception:
                    dead.add(other)
            _connections[resume_id] -= dead

        elif msg_type == "request_ai":
            if ai_task and not ai_task.done():
                ai_task.cancel()

            raw_text = payload.get("raw_text", "")
            job_desc = payload.get("job_description")
            section = payload.get("section")
            instructions = payload.get("instructions")

            ai_task = asyncio.create_task(_run_ai(ws, raw_text, job_desc, section, instructions))
            try:
                await ai_task
            except asyncio.CancelledError:
                await ws.send_json({"type": "ai_cancelled", "payload": {}})
            except Exception as e:
                await ws.send_json({"type": "ai_error", "payload": {"message": str(e)}})

        elif msg_type == "cancel_ai":
            if ai_task and not ai_task.done():
                ai_task.cancel()
            await ws.send_json({"type": "ai_cancelled", "payload": {}})

        elif msg_type == "request_ghost":
            context = payload.get("context", "")
            prompt = f'Complete this resume bullet point naturally (max 15 words, no newline): "{context}"'
            try:
                text = await llm_invoke([HumanMessage(content=prompt)])
                for word in re.split(r'(\s+)', text):
                    if word:
                        await ws.send_json({"type": "ghost_token", "payload": {"token": word}})
                        await asyncio.sleep(0.02)
                await ws.send_json({"type": "ghost_done", "payload": {"text": text}})
            except Exception as e:
                await ws.send_json({"type": "ghost_done", "payload": {"text": ""}})

        elif msg_type == "ping":
            await ws.send_json({"type": "pong", "payload": {}})
