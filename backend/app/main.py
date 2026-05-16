from fastapi import FastAPI, WebSocket, Query, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional

from app.config import settings
from app.services.database import init_db
from app.api.v1 import resumes, ats, auth, share
from app.websockets.handler import ws_connect
from app.services.auth import get_current_user
from app.models.user import User


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Resume Agent API",
    version="1.0.0",
    description="Enterprise-Grade AI-Native Collaborative Resume Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(resumes.router, prefix="/api/v1", tags=["resumes"])
app.include_router(ats.router, prefix="/api/v1", tags=["ats"])
app.include_router(share.router, tags=["share"])


@app.post("/api/v1/bullet-rewrite")
async def bullet_rewrite(
    payload: dict,
    _current_user: User = Depends(get_current_user),
):
    from langchain_core.messages import HumanMessage
    from app.services.llm import llm_invoke
    bullet = str(payload.get("bullet", "")).strip()
    instruction = str(payload.get("instruction", "Improve this resume bullet.")).strip()
    if not bullet:
        return {"improved": ""}
    prompt = f"""You are improving a single resume bullet point.

Original bullet: {bullet}

Task: {instruction}

Rules:
- Return ONLY the improved bullet text — no explanation, no quotes, no markdown
- Preserve the core achievement; do not invent new facts
- Keep it to one sentence"""
    improved = await llm_invoke([HumanMessage(content=prompt)])
    # Strip quotes/markdown the model might add
    improved = improved.strip().strip('"').strip("'").lstrip("- ").strip()
    return {"improved": improved}


@app.post("/api/v1/extract-text")
async def extract_text(
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_user),
):
    data = await file.read()
    name = (file.filename or "").lower()
    if name.endswith(".pdf"):
        from pypdf import PdfReader
        import io
        reader = PdfReader(io.BytesIO(data))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    else:
        text = data.decode("utf-8", errors="replace")
    return {"text": text.strip()}


@app.websocket("/ws/resume/{resume_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    resume_id: str,
    token: Optional[str] = Query(default=None),
):
    await ws_connect(resume_id, websocket, token=token)


@app.get("/health")
async def health():
    return {"status": "ok"}
