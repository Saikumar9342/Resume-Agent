from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.services.database import init_db
from app.api.v1 import resumes, ats
from app.websockets.handler import ws_connect


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

app.include_router(resumes.router, prefix="/api/v1", tags=["resumes"])
app.include_router(ats.router, prefix="/api/v1", tags=["ats"])


@app.websocket("/ws/resume/{resume_id}")
async def websocket_endpoint(websocket: WebSocket, resume_id: str):
    await ws_connect(resume_id, websocket)


@app.get("/health")
async def health():
    return {"status": "ok"}
