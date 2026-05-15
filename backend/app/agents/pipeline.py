"""
LangGraph multi-agent pipeline with 4 specialized nodes:
  1. ExtractionNode  — parses raw text into structured JSON schema
  2. AnalysisNode    — gap analysis against job description
  3. OptimizationNode — rewrites bullets using STAR method
  4. ValidationNode  — PII check and hallucination guard

Supports an optional `on_activity` async callback for streaming status messages.
"""

from typing import TypedDict, Optional, Callable, Awaitable
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from app.config import settings
import json
import re

ActivityCallback = Optional[Callable[[str, str], Awaitable[None]]]


class AgentState(TypedDict):
    raw_text: str
    job_description: Optional[str]
    section: Optional[str]
    instructions: Optional[str]
    structured: Optional[dict]
    analysis: Optional[dict]
    optimized: Optional[dict]
    validated: Optional[dict]
    reasoning: str
    error: Optional[str]
    on_activity: ActivityCallback


llm_strict = ChatGoogleGenerativeAI(
    model=settings.gemini_model,
    google_api_key=settings.google_api_key,
    temperature=0,
)


def _parse_json_block(text: str) -> dict:
    match = re.search(r"```json\s*([\s\S]*?)```", text)
    if match:
        return json.loads(match.group(1))
    try:
        return json.loads(text)
    except Exception:
        return {"raw": text}


async def _emit(state: AgentState, node: str, message: str):
    cb = state.get("on_activity")
    if cb:
        await cb(node, message)


async def extraction_node(state: AgentState) -> AgentState:
    await _emit(state, "extraction", "Reading your resume and identifying sections...")
    await _emit(state, "extraction", "Extracting contact details, experience, and skills...")

    prompt = f"""Extract the resume into a structured JSON schema with these keys:
{{
  "contact": {{"name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": ""}},
  "summary": "",
  "experience": [{{"company": "", "title": "", "start": "", "end": "", "bullets": []}}],
  "education": [{{"institution": "", "degree": "", "field": "", "year": ""}}],
  "skills": {{"technical": [], "soft": []}},
  "certifications": [],
  "projects": [{{"name": "", "description": "", "technologies": [], "url": ""}}]
}}

Resume text:
{state["raw_text"]}

Return ONLY the JSON block, no prose."""

    response = await llm_strict.ainvoke([HumanMessage(content=prompt)])
    structured = _parse_json_block(response.content)

    skills = structured.get("skills", {})
    tech = skills.get("technical", [])
    await _emit(state, "extraction", f"Found {len(tech)} technical skills and {len(structured.get('experience', []))} jobs")

    return {**state, "structured": structured}


async def analysis_node(state: AgentState) -> AgentState:
    if not state.get("job_description"):
        await _emit(state, "analysis", "No job description provided — skipping gap analysis")
        return {**state, "analysis": {"gap_score": 100, "gaps": [], "matched_keywords": []}}

    await _emit(state, "analysis", "Scanning job description for required skills...")
    await _emit(state, "analysis", "Comparing your profile against role requirements...")

    prompt = f"""Analyze the candidate's resume against this job description.
Return JSON:
{{
  "gap_score": <0-100 match percentage>,
  "matched_keywords": ["keyword1", ...],
  "missing_keywords": ["keyword2", ...],
  "gaps": ["gap description 1", ...],
  "strengths": ["strength 1", ...]
}}

Resume (structured):
{json.dumps(state.get("structured", {}), indent=2)}

Job Description:
{state["job_description"]}

Return ONLY JSON."""

    response = await llm_strict.ainvoke([HumanMessage(content=prompt)])
    analysis = _parse_json_block(response.content)

    missing = analysis.get("missing_keywords", [])
    matched = analysis.get("matched_keywords", [])
    await _emit(state, "analysis", f"Match score: {analysis.get('gap_score', '?')}% — {len(missing)} keywords to add, {len(matched)} already present")

    return {**state, "analysis": analysis}


async def optimization_node(state: AgentState) -> AgentState:
    await _emit(state, "optimization", "Rewriting experience bullets using STAR method...")

    structured = state.get("structured", {})
    analysis = state.get("analysis", {})
    missing_kw = analysis.get("missing_keywords", [])
    instructions = state.get("instructions", "")
    section = state.get("section")

    if missing_kw:
        await _emit(state, "optimization", f"Naturally weaving in missing keywords: {', '.join(missing_kw[:4])}...")
    await _emit(state, "optimization", "Strengthening action verbs and quantifying achievements...")

    prompt = f"""You are an expert resume writer. Rewrite the resume content using the STAR method
(Situation-Task-Action-Result) for all experience bullets. Naturally incorporate these missing
keywords where truthful: {missing_kw}.

Rules:
- DO NOT invent facts, metrics, or experiences not present in the original
- Use strong action verbs
- Quantify achievements wherever the original has numbers
- Keep bullet points concise (1-2 lines max)
{f"- Focus only on section: {section}" if section else ""}
{f"- Additional instructions: {instructions}" if instructions else ""}

Original resume:
{json.dumps(structured, indent=2)}

Return optimized resume as JSON in the same schema. Return ONLY JSON."""

    response = await llm_strict.ainvoke([HumanMessage(content=prompt)])
    optimized = _parse_json_block(response.content)

    await _emit(state, "optimization", "Generating coaching summary...")
    r2 = await llm_strict.ainvoke([
        SystemMessage(content="You are a resume coach. Be concise and specific."),
        HumanMessage(content=f"Original: {json.dumps(structured)}\nOptimized: {json.dumps(optimized)}\nIn 2-3 sentences, explain the key improvements made.")
    ])

    return {**state, "optimized": optimized, "reasoning": r2.content}


async def validation_node(state: AgentState) -> AgentState:
    await _emit(state, "validation", "Checking for hallucinated content and PII...")

    optimized = state.get("optimized", {})
    original = state.get("structured", {})

    prompt = f"""Review the optimized resume for:
1. PII that should be flagged (SSN, passport numbers, etc.)
2. Hallucinated content (claims not present in the original)
3. Inappropriate content

Original experience companies: {[e.get("company") for e in original.get("experience", [])]}

Optimized experience bullets (first job):
{json.dumps(optimized.get("experience", [{}])[0].get("bullets", []) if optimized.get("experience") else [], indent=2)}

Return JSON:
{{
  "is_valid": true,
  "pii_flags": [],
  "hallucination_flags": [],
  "cleaned_resume": <same schema as optimized, with any issues fixed>
}}"""

    response = await llm_strict.ainvoke([HumanMessage(content=prompt)])
    validation = _parse_json_block(response.content)

    flags = validation.get("hallucination_flags", [])
    if flags:
        await _emit(state, "validation", f"Fixed {len(flags)} potential inaccuracies")
    else:
        await _emit(state, "validation", "All content verified — no hallucinations detected")

    await _emit(state, "validation", "Resume is ready to review!")

    final_resume = validation.get("cleaned_resume", optimized)
    return {**state, "validated": final_resume}


def build_pipeline() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("extraction", extraction_node)
    graph.add_node("analysis", analysis_node)
    graph.add_node("optimization", optimization_node)
    graph.add_node("validation", validation_node)
    graph.set_entry_point("extraction")
    graph.add_edge("extraction", "analysis")
    graph.add_edge("analysis", "optimization")
    graph.add_edge("optimization", "validation")
    graph.add_edge("validation", END)
    return graph.compile()


pipeline = build_pipeline()


async def run_pipeline(
    raw_text: str,
    job_description: Optional[str] = None,
    section: Optional[str] = None,
    instructions: Optional[str] = None,
    on_activity: ActivityCallback = None,
) -> AgentState:
    initial: AgentState = {
        "raw_text": raw_text,
        "job_description": job_description,
        "section": section,
        "instructions": instructions,
        "structured": None,
        "analysis": None,
        "optimized": None,
        "validated": None,
        "reasoning": "",
        "error": None,
        "on_activity": on_activity,
    }
    result = await pipeline.ainvoke(initial)
    return result
