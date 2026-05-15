"""
WebSocket handler for /ws/resume/{id}.
Supports:
  - patch: apply content patch from client, broadcast to other sessions
  - request_ai: trigger streaming AI suggestion with live activity messages
  - request_ghost: get inline ghost-text completion
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict

from app.agents.pipeline import run_pipeline
from app.services.diff import generate_diff_patches
from app.config import settings
from langchain_google_genai import ChatGoogleGenerativeAI

_connections: Dict[str, set] = {}


async def ws_connect(resume_id: str, ws: WebSocket):
    await ws.accept()
    _connections.setdefault(resume_id, set()).add(ws)
    try:
        await _handle(resume_id, ws)
    except WebSocketDisconnect:
        pass
    finally:
        _connections[resume_id].discard(ws)


async def _broadcast(resume_id: str, message: dict, exclude: WebSocket = None):
    dead = set()
    for ws in _connections.get(resume_id, set()):
        if ws is exclude:
            continue
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    _connections[resume_id] -= dead


async def _handle(resume_id: str, ws: WebSocket):
    llm_stream = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.4,
    )

    async for data in ws.iter_json():
        msg_type = data.get("type")
        payload = data.get("payload", {})

        if msg_type == "patch":
            await _broadcast(resume_id, {"type": "patch", "payload": payload}, exclude=ws)

        elif msg_type == "request_ai":
            raw_text = payload.get("raw_text", "")
            job_desc = payload.get("job_description")
            section = payload.get("section")

            await ws.send_json({"type": "ai_stream_start", "payload": {}})

            # Activity callback — streams live status messages to the client
            async def on_activity(node: str, message: str):
                await ws.send_json({
                    "type": "ai_activity",
                    "payload": {"node": node, "message": message},
                })

            state = await run_pipeline(
                raw_text=raw_text,
                job_description=job_desc,
                section=section,
                on_activity=on_activity,
            )

            suggested = state.get("validated") or state.get("optimized") or {}
            patches = generate_diff_patches(state.get("structured", {}), suggested)

            await ws.send_json({
                "type": "ai_suggestion",
                "payload": {
                    "suggested": suggested,
                    "diff_patches": patches,
                    "reasoning": state.get("reasoning", ""),
                },
            })

        elif msg_type == "request_ghost":
            context = payload.get("context", "")
            prompt = f'Complete this resume bullet point naturally (max 15 words, no newline): "{context}"'

            tokens = []
            async for chunk in llm_stream.astream(prompt):
                token = chunk.content
                if token:
                    tokens.append(token)
                    await ws.send_json({"type": "ghost_token", "payload": {"token": token}})

            await ws.send_json({"type": "ghost_done", "payload": {"text": "".join(tokens)}})

        elif msg_type == "ping":
            await ws.send_json({"type": "pong", "payload": {}})
