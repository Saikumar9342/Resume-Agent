# Resume Agent — Dev Commands

## Backend

```bash
cd backend

# Create & activate venv (first time only)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start dev server
.\venv\Scripts\uvicorn app.main:app --reload

# Run on custom port
.\venv\Scripts\uvicorn app.main:app --reload --port 8001
```

**API runs at:** `http://localhost:8000`  
**Docs (Swagger):** `http://localhost:8000/docs`

---

## Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type-check only (no emit)
npx tsc --noEmit
```

**App runs at:** `http://localhost:3000`

---

## Database

The app uses SQLite — file is `backend/resume_agent.db`.

```bash
# Reset DB (stop uvicorn first, then delete the file)
del backend\resume_agent.db

# Or run a one-off migration (add a column without deleting data)
cd backend
.\venv\Scripts\python.exe -c "
import sqlite3
con = sqlite3.connect('resume_agent.db')
cur = con.cursor()
cur.execute('ALTER TABLE resumes ADD COLUMN my_col TEXT')
con.commit(); con.close()
"
```

---

## Environment Variables (`backend/.env`)

| Key | Required | Description |
|-----|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path (default) or PostgreSQL URL |
| `SECRET_KEY` | Yes | JWT signing secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GOOGLE_API_KEY` | Yes | Gemini free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | Optional | Groq free key from [console.groq.com](https://console.groq.com) — enables llama-3.3-70b fallback |
| `CORS_ORIGINS` | Yes | JSON array of allowed origins, e.g. `["http://localhost:3000"]` |

---

## LLM Fallback Chain

When a model hits quota, the backend automatically falls back in this order:

| # | Model | Quota (free) | Key needed |
|---|-------|-------------|------------|
| 1 | `gemini-2.0-flash` | 15 RPM / 1500 RPD | `GOOGLE_API_KEY` |
| 2 | `groq/llama-3.3-70b` | 30 RPM / 14400 RPD | `GROQ_API_KEY` |
| 3 | `groq/llama-3.1-8b` | 30 RPM | `GROQ_API_KEY` |
| 4 | `gemini-2.0-flash-lite` | 30 RPM / 1500 RPD | `GOOGLE_API_KEY` |
| 5 | `ollama/llama3.2` | Unlimited | Ollama running locally |

- **429** → model cooled down for 60s, next model tried immediately  
- **404** → model permanently skipped for the session  
- **503/timeout** → retried up to 2x before moving on  

---

## Git

```bash
# Status
git status

# Stage and commit
git add .
git commit -m "feat: your message"

# Push
git push

# View recent commits
git log --oneline -10
```

---

## Editor Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `⌘↵` / `Ctrl+Enter` | Run AI rewrite |
| `⌘H` / `Ctrl+H` | Toggle ATS heatmap |
| `Escape` | Close palette / cancel |

---

## Common Issues

**`table resumes has no column named user_id`**  
→ Old DB schema. Stop uvicorn, delete `backend/resume_agent.db`, restart.

**`Failed to fetch` on POST /resumes**  
→ Stale JWT in localStorage. Open DevTools → Application → Local Storage → delete `resume-agent-auth` → refresh → log in again.

**`429 RESOURCE_EXHAUSTED` (Gemini)**  
→ Daily quota hit. Add `GROQ_API_KEY` to `.env` for automatic fallback, or get a new Gemini key from aistudio.google.com.

**`404 NOT_FOUND` for gemini-1.5-flash**  
→ That model requires API v1beta which this key type doesn't support. It's permanently skipped automatically — no action needed.

**Pyrefly "Cannot find module" warnings in VS Code**  
→ Pyrefly is reading global Python instead of venv. Already fixed in `.vscode/settings.json` — reload VS Code window (`Ctrl+Shift+P` → Reload Window).
