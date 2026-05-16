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


@app.post("/api/v1/style-advisor")
async def style_advisor(
    payload: dict,
    _current_user: User = Depends(get_current_user),
):
    from langchain_core.messages import HumanMessage
    from app.services.llm import llm_invoke
    import json, re

    prompt_text = str(payload.get("prompt", "")).strip()
    role = str(payload.get("role", "")).strip()
    industry = str(payload.get("industry", "")).strip()

    context_parts = []
    if role:      context_parts.append(f"Role: {role}")
    if industry:  context_parts.append(f"Industry: {industry}")
    if prompt_text: context_parts.append(f"User request: {prompt_text}")
    context = "\n".join(context_parts) or "General professional resume"

    system = f"""You are a resume design expert. Based on the context below, recommend the best visual style settings for a resume.

Context:
{context}

Return a JSON object with EXACTLY these keys (no extra text, no markdown fences):
{{
  "fontFamily": one of ["Inter, sans-serif", "Georgia, 'Times New Roman', serif", "'Palatino Linotype', Palatino, Georgia, serif", "'Roboto', Arial, sans-serif", "'Merriweather', Georgia, serif", "'Lato', Arial, sans-serif", "'Source Sans 3', Arial, sans-serif", "'Playfair Display', Georgia, serif"],
  "accentColor": a hex color string like "#1a56db",
  "headingColor": a hex color string,
  "bodyColor": a hex color string,
  "fontSize": a number between 9 and 14,
  "lineHeight": a number between 1.2 and 2.0,
  "sectionSpacing": a number between 8 and 36,
  "pageMargin": a number between 20 and 72,
  "reasoning": a single sentence explaining why these choices suit the context
}}

Guidelines by industry:
- Tech/startup: Inter font, blue accent, tight spacing, modern feel
- Finance/law/consulting: Georgia or Palatino, dark navy/charcoal accent, generous spacing, formal
- Creative/design: Playfair Display, vibrant accent color, relaxed spacing
- Healthcare/academia: Merriweather or Lato, muted professional colors
- General: Inter, blue accent, balanced spacing"""

    raw = await llm_invoke([HumanMessage(content=system)])
    # Extract JSON from response
    match = re.search(r'\{[\s\S]*\}', raw)
    if not match:
        return {"error": "Could not parse style recommendation"}
    try:
        result = json.loads(match.group())
        return result
    except Exception:
        return {"error": "Invalid JSON from model"}


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
