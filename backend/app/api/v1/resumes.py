from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import secrets

from app.models.resume import Resume
from app.models.user import User
from app.models.schemas import ResumeCreate, ResumeResponse, RewriteRequest, RewriteResponse
from app.services.database import get_db
from app.services.auth import get_current_user
from app.services.diff import generate_diff_patches
from app.services.llm import llm_invoke
from app.agents.pipeline import run_pipeline

router = APIRouter()


@router.post("/resumes", response_model=ResumeResponse)
async def create_resume(
    payload: ResumeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = Resume(
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        raw_text=payload.raw_text,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/resumes", response_model=list[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/resumes/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.patch("/resumes/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    allowed = {"title", "content", "raw_text"}
    for k, v in payload.items():
        if k in allowed:
            setattr(resume, k, v)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.delete("/resumes/{resume_id}")
async def delete_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    await db.delete(resume)
    await db.commit()
    return {"deleted": resume_id}


@router.post("/resumes/{resume_id}/rewrite", response_model=RewriteResponse)
async def rewrite_resume(
    resume_id: str,
    payload: RewriteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    raw_text = resume.raw_text or ""
    if not raw_text and resume.content:
        raw_text = json.dumps(resume.content)

    state = await run_pipeline(
        raw_text=raw_text,
        job_description=payload.job_description,
        section=payload.section,
        instructions=payload.instructions,
    )

    original = resume.content or state.get("structured", {})
    suggested = state.get("validated") or state.get("optimized") or {}
    patches = generate_diff_patches(original, suggested)

    return RewriteResponse(
        resume_id=resume_id,
        original=original,
        suggested=suggested,
        diff_patches=patches,
        reasoning=state.get("reasoning", ""),
    )


@router.get("/resumes/{resume_id}/export")
async def export_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    c = resume.content or {}
    contact = c.get("contact", {})
    name = contact.get("name", resume.title or "Resume")

    def esc(s: str) -> str:
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def section(title: str, body: str) -> str:
        return f'<section><h2>{esc(title)}</h2>{body}</section>'

    # Contact header
    contact_parts = [contact.get("email"), contact.get("phone"), contact.get("location"),
                     contact.get("linkedin"), contact.get("github")]
    contact_html = " &nbsp;·&nbsp; ".join(esc(p) for p in contact_parts if p)

    # Summary
    summary_html = f"<p>{esc(c.get('summary', ''))}</p>" if c.get("summary") else ""

    # Experience
    exp_items = []
    for e in c.get("experience", []):
        bullets = "".join(f"<li>{esc(b)}</li>" for b in e.get("bullets", []))
        exp_items.append(
            f'<div class="entry"><div class="entry-header"><strong>{esc(e.get("company",""))}</strong>'
            f'<span class="date">{esc(e.get("start",""))} – {esc(e.get("end",""))}</span></div>'
            f'<div class="role">{esc(e.get("title",""))}</div><ul>{bullets}</ul></div>'
        )

    # Education
    edu_items = []
    for e in c.get("education", []):
        edu_items.append(
            f'<div class="entry"><div class="entry-header"><strong>{esc(e.get("institution",""))}</strong>'
            f'<span class="date">{esc(e.get("year",""))}</span></div>'
            f'<div class="role">{esc(e.get("degree",""))} in {esc(e.get("field",""))}</div></div>'
        )

    # Skills
    tech = c.get("skills", {}).get("technical", [])
    skills_html = f'<p>{", ".join(esc(s) for s in tech)}</p>' if tech else ""

    # Projects
    proj_items = []
    for p in c.get("projects", []):
        techs = ", ".join(p.get("technologies", []))
        proj_items.append(
            f'<div class="entry"><strong>{esc(p.get("name",""))}</strong>'
            f'{(" &nbsp;·&nbsp; <em>" + esc(techs) + "</em>") if techs else ""}'
            f'<p>{esc(p.get("description",""))}</p></div>'
        )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(name)}</title>
<style>
  body {{ font-family: Georgia, serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.55; font-size: 14px; }}
  h1 {{ font-size: 26px; margin: 0 0 4px; letter-spacing: -0.5px; }}
  .contact {{ color: #555; font-size: 12.5px; margin-bottom: 28px; }}
  h2 {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 28px 0 14px; }}
  .entry {{ margin-bottom: 14px; }}
  .entry-header {{ display: flex; justify-content: space-between; }}
  .date {{ color: #666; font-size: 12.5px; }}
  .role {{ color: #444; font-size: 13px; margin: 2px 0 6px; font-style: italic; }}
  ul {{ margin: 4px 0; padding-left: 18px; }}
  li {{ margin-bottom: 3px; }}
  @media print {{ body {{ margin: 0; }} }}
</style>
</head>
<body>
<h1>{esc(name)}</h1>
<div class="contact">{contact_html}</div>
{section("Summary", summary_html) if summary_html else ""}
{section("Experience", "".join(exp_items)) if exp_items else ""}
{section("Education", "".join(edu_items)) if edu_items else ""}
{section("Skills", skills_html) if skills_html else ""}
{section("Projects", "".join(proj_items)) if proj_items else ""}
</body>
</html>"""

    filename = name.replace(" ", "_").lower()
    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": f'attachment; filename="{filename}.html"'},
    )


@router.post("/resumes/{resume_id}/cover-letter")
async def generate_cover_letter(
    resume_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job_description = payload.get("job_description", "")
    company = payload.get("company", "the company")
    role = payload.get("role", "this role")
    tone = payload.get("tone", "professional")
    tone_directive = {
        "professional": "Confident and polished. Warm but business-appropriate.",
        "enthusiastic": "Energetic and passionate. Show genuine excitement for the role.",
        "concise": "Tight and direct. Three short paragraphs maximum, no fluff.",
    }.get(tone, "Confident and polished. Warm but business-appropriate.")

    content = resume.content or {}
    contact = content.get("contact", {})
    name = contact.get("name", "")
    summary = content.get("summary", "")
    experience = content.get("experience", [])
    skills = content.get("skills", {}).get("technical", [])

    exp_text = "\n".join([
        f"- {e.get('title')} at {e.get('company')} ({e.get('start')}–{e.get('end')}): " +
        "; ".join(e.get("bullets", [])[:2])
        for e in experience[:3]
    ])

    prompt = f"""Write a cover letter for {name} applying for the role of {role} at {company}.

Resume summary: {summary}

Key experience:
{exp_text}

Top skills: {", ".join(skills[:10])}

Job description:
{job_description[:1500]}

Tone: {tone_directive}

Instructions:
- Write 3–4 paragraphs: opener, relevant experience, why this company/role, closing
- Reference specific achievements from the resume
- Do NOT use placeholders like [Your Name], [Date], or [Address] — use the actual name from the resume
- Do NOT include a letterhead, date, or recipient block — only the letter body
- Return ONLY the cover letter body text"""

    from langchain_core.messages import HumanMessage
    text = await llm_invoke([HumanMessage(content=prompt)])
    return {"cover_letter": text, "name": name, "company": company, "role": role}


@router.post("/resumes/{resume_id}/section-chat")
async def section_chat(
    resume_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    section = str(payload.get("section", ""))
    instruction = str(payload.get("instruction", ""))
    history = payload.get("history", [])

    content = resume.content or {}
    section_data = content.get(section, None)

    history_text = ""
    if history:
        for msg in history[-4:]:  # last 4 messages for context
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_text += f"{role}: {msg.get('text', '')}\n"

    prompt = f"""You are an AI assistant helping improve the "{section}" section of a resume.

Current {section} content:
{json.dumps(section_data, indent=2) if section_data else "Empty"}

{f"Conversation so far:{chr(10)}{history_text}" if history_text else ""}
User: {instruction}

Instructions:
- Give a helpful, specific response about improving the {section} section
- If the user is asking you to rewrite/improve it, provide the improved version as JSON in a code block
- If just answering a question, respond conversationally (2-3 sentences max)
- Be direct and specific — reference actual content from the section when possible
- If you provide improved content, format it as valid JSON matching the original structure"""

    from langchain_core.messages import HumanMessage
    reply = await llm_invoke([HumanMessage(content=prompt)])

    # Try to extract JSON from reply if AI rewrote the section
    improved_section = None
    import re
    json_match = re.search(r"```(?:json)?\s*(\{[\s\S]+?\}|\[[\s\S]+?\])\s*```", reply)
    if json_match:
        try:
            improved_section = json.loads(json_match.group(1))
            # Strip the JSON block from the reply text
            reply = reply[:json_match.start()].strip() + "\n\n✓ Applied to your resume." + reply[json_match.end():].strip()
        except json.JSONDecodeError:
            pass

    return {"reply": reply.strip(), "improved_section": improved_section}


@router.post("/resumes/{resume_id}/interview-prep")
async def generate_interview_prep(
    resume_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job_description = payload.get("job_description", "")
    company = payload.get("company", "")
    role = payload.get("role", "")
    focus = payload.get("focus", "all")  # behavioral | technical | situational | all

    content = resume.content or {}
    contact = content.get("contact", {})
    name = contact.get("name", "the candidate")
    summary = content.get("summary", "")
    experience = content.get("experience", [])
    skills = content.get("skills", {})
    technical_skills = skills.get("technical", [])
    projects = content.get("projects", [])

    exp_text = "\n".join([
        f"- {e.get('title')} at {e.get('company')}: " + "; ".join(e.get("bullets", [])[:3])
        for e in experience[:4]
    ])

    proj_text = "\n".join([
        f"- {p.get('name')}: {p.get('description', '')}"
        for p in projects[:3]
    ])

    focus_instruction = {
        "behavioral": "Generate ONLY behavioral questions (STAR method: Situation, Task, Action, Result). Prefix each with [BEHAVIORAL].",
        "technical": "Generate ONLY technical questions testing specific skills from the resume. Prefix each with [TECHNICAL].",
        "situational": "Generate ONLY situational/hypothetical scenario questions. Prefix each with [SITUATIONAL].",
        "all": "Mix behavioral [BEHAVIORAL], technical [TECHNICAL], and situational [SITUATIONAL] questions. Prefix each appropriately.",
    }.get(focus, "Mix all question types with appropriate prefixes.")

    prompt = f"""Generate 10 targeted interview questions for {name} interviewing for {role or "this role"}{f" at {company}" if company else ""}.

Candidate profile:
Summary: {summary}
Experience:
{exp_text}
Technical skills: {", ".join(technical_skills[:15])}
Projects:
{proj_text}

Job description:
{job_description[:1500] if job_description else "Not provided — base questions on the resume profile."}

Instructions:
{focus_instruction}
- For each question also provide: a 2-3 sentence HINT on how to answer it using this specific resume's content
- Format each as:
  Q: [question text]
  HINT: [answer guidance using their specific experience]
- Make questions progressively harder (1-3 easy, 4-7 medium, 8-10 challenging)
- Reference specific companies, projects, or skills from the resume where possible
- Do NOT ask generic questions — every question should be tailored to this resume"""

    from langchain_core.messages import HumanMessage
    text = await llm_invoke([HumanMessage(content=prompt)])
    return {"questions": text, "name": name, "role": role, "company": company, "focus": focus}


@router.post("/resumes/{resume_id}/share")
async def create_share_link(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if not resume.share_token:
        resume.share_token = secrets.token_urlsafe(16)
        await db.commit()
        await db.refresh(resume)
    return {"token": resume.share_token}
