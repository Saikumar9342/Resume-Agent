from fastapi import FastAPI, WebSocket, Query, UploadFile, File, Depends, HTTPException
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


@app.get("/api/v1/drive/auth-url")
async def drive_auth_url(
    _current_user: User = Depends(get_current_user),
):
    """Return a Google OAuth2 URL the frontend should redirect/popup to."""
    from urllib.parse import urlencode
    client_id = settings.google_client_id.strip()
    if not client_id:
        raise HTTPException(status_code=503, detail="GOOGLE_CLIENT_ID not configured. Add it to backend .env.")
    redirect_uri = settings.google_redirect_uri
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/drive.file",
        "access_type": "offline",
        "prompt": "consent",
    }
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"}


@app.get("/api/v1/drive/callback")
async def drive_callback(code: str):
    """Exchange code for tokens — stores in session cookie or returns to frontend."""
    import httpx
    from fastapi.responses import HTMLResponse
    client_id = settings.google_client_id
    client_secret = settings.google_client_secret
    redirect_uri = settings.google_redirect_uri
    async with httpx.AsyncClient() as client:
        r = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
    tokens = r.json()
    access_token = tokens.get("access_token", "")
    # Pass token back to opener window via postMessage
    return HTMLResponse(f"""
    <html><body><script>
      window.opener.postMessage({{ type: 'GDRIVE_TOKEN', token: '{access_token}' }}, '*');
      window.close();
    </script></body></html>
    """)


@app.post("/api/v1/drive/save")
async def drive_save_resume(
    payload: dict,
    _current_user: User = Depends(get_current_user),
):
    """Upload a resume as a PDF-formatted HTML file to Google Drive Resumes/ folder."""
    import httpx, json as _json
    access_token = str(payload.get("access_token", ""))
    filename = str(payload.get("filename", "resume.html"))
    html_content = str(payload.get("html", ""))

    if not access_token or not html_content:
        raise HTTPException(status_code=400, detail="access_token and html required")

    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        # Find or create Resumes/ folder
        q = "mimeType='application/vnd.google-apps.folder' and name='Resumes' and trashed=false"
        search = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            headers=headers, params={"q": q, "fields": "files(id,name)"},
        )
        files = search.json().get("files", [])
        if files:
            folder_id = files[0]["id"]
        else:
            create = await client.post(
                "https://www.googleapis.com/drive/v3/files",
                headers={**headers, "Content-Type": "application/json"},
                content=_json.dumps({"name": "Resumes", "mimeType": "application/vnd.google-apps.folder"}),
            )
            folder_id = create.json()["id"]

        # Upload HTML and convert to Google Doc (readable in Drive, exportable as PDF/Word)
        doc_name = filename.replace(".html", "")
        boundary = "------ResumeAgentBoundary"
        meta = _json.dumps({
            "name": doc_name,
            "parents": [folder_id],
            "mimeType": "application/vnd.google-apps.document",
        })
        body = (
            f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
            f"{meta}\r\n"
            f"--{boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n"
            f"{html_content}\r\n"
            f"--{boundary}--"
        ).encode()

        upload = await client.post(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            headers={**headers, "Content-Type": f"multipart/related; boundary={boundary}"},
            content=body,
        )
        result = upload.json()
        file_id = result.get("id")
        # Link to preview in Drive (open in browser to print as PDF)
        preview_url = f"https://drive.google.com/file/d/{file_id}/view" if file_id else None
        return {"file_id": file_id, "name": result.get("name"), "folder_id": folder_id, "doc_url": preview_url}


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
