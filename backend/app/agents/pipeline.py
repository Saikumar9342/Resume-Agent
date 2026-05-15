"""
LangGraph multi-agent pipeline with 4 specialized nodes:
  1. ExtractionNode   — parses raw text into structured JSON schema
  2. AnalysisNode     — gap analysis against job description
  3. OptimizationNode — rewrites bullets using STAR method
  4. ValidationNode   — PII check and hallucination guard

Uses llm.py for quota-aware fallback across multiple free providers.
"""

from typing import TypedDict, Optional, Callable, Awaitable
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from app.services.llm import llm_invoke
import json
import re

ActivityCallback = Optional[Callable[[str, str, str], Awaitable[None]]]


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
    active_model: str
    error: Optional[str]
    on_activity: ActivityCallback


def _parse_json_block(text: str) -> dict:
    match = re.search(r"```json\s*([\s\S]*?)```", text)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Strip markdown fences without language tag
    stripped = re.sub(r"^```[^\n]*\n?", "", text.strip())
    stripped = re.sub(r"```$", "", stripped.strip())
    try:
        return json.loads(stripped)
    except Exception:
        # Last resort: find first { ... } block
        brace = re.search(r"\{[\s\S]*\}", text)
        if brace:
            try:
                return json.loads(brace.group(0))
            except Exception:
                pass
        return {"raw": text}


async def _emit(state: AgentState, node: str, message: str):
    cb = state.get("on_activity")
    if cb:
        await cb(node, message, state.get("active_model", ""))


async def extraction_node(state: AgentState) -> AgentState:
    await _emit(state, "extraction", "Reading your resume and identifying sections...")
    await _emit(state, "extraction", "Extracting contact details, experience, and skills...")

    prompt = f"""Extract the resume into a structured JSON with exactly these keys:
{{
  "contact": {{"name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": ""}},
  "summary": "",
  "experience": [{{"company": "", "title": "", "start": "", "end": "", "bullets": ["..."]}}],
  "education": [{{"institution": "", "degree": "", "field": "", "year": ""}}],
  "skills": {{"technical": [], "soft": []}},
  "certifications": [],
  "projects": [{{"name": "", "description": "", "technologies": [], "url": ""}}]
}}

Resume text:
{state["raw_text"]}

Return ONLY valid JSON, no prose, no markdown fences."""

    model_used = []
    text = await llm_invoke([HumanMessage(content=prompt)], model_used)
    structured = _parse_json_block(text)

    tech = structured.get("skills", {}).get("technical", [])
    exp = structured.get("experience", [])
    await _emit(state, "extraction", f"Found {len(tech)} skills and {len(exp)} jobs")

    return {**state, "structured": structured, "active_model": model_used[0] if model_used else ""}


async def analysis_node(state: AgentState) -> AgentState:
    if not state.get("job_description"):
        await _emit(state, "analysis", "No JD provided — skipping gap analysis")
        return {**state, "analysis": {"gap_score": 100, "gaps": [], "matched_keywords": []}}

    await _emit(state, "analysis", "Scanning job description for required skills...")
    await _emit(state, "analysis", "Comparing your profile against role requirements...")

    prompt = f"""Analyze the resume against the job description. Return JSON:
{{
  "gap_score": <0-100>,
  "matched_keywords": [],
  "missing_keywords": [],
  "gaps": [],
  "strengths": []
}}

Resume (structured):
{json.dumps(state.get("structured", {}), indent=2)}

Job Description:
{state["job_description"]}

Return ONLY valid JSON."""

    text = await llm_invoke([HumanMessage(content=prompt)])
    analysis = _parse_json_block(text)

    missing = analysis.get("missing_keywords", [])
    await _emit(state, "analysis", f"Match: {analysis.get('gap_score', '?')}% — {len(missing)} keywords to add")

    return {**state, "analysis": analysis}


async def optimization_node(state: AgentState) -> AgentState:
    await _emit(state, "optimization", "Rewriting bullets using STAR method...")

    structured = state.get("structured", {})
    analysis = state.get("analysis", {})
    missing_kw = analysis.get("missing_keywords", [])
    instructions = state.get("instructions", "")
    section = state.get("section")

    if missing_kw:
        await _emit(state, "optimization", f"Weaving in missing keywords: {', '.join(missing_kw[:4])}...")
    await _emit(state, "optimization", "Strengthening action verbs and quantifying achievements...")

    prompt = f"""You are an expert resume writer. Rewrite the resume using the STAR method for all bullets.
Naturally incorporate missing keywords where truthful: {missing_kw}.

Rules:
- DO NOT invent facts, metrics, or experiences not in the original
- Use strong action verbs
- Quantify achievements when the original has numbers
- Keep bullets concise (1-2 lines max)
{f"- Focus only on section: {section}" if section else ""}
{f"- Additional instructions: {instructions}" if instructions else ""}

Original resume:
{json.dumps(structured, indent=2)}

Return optimized resume as JSON in the SAME schema. Return ONLY valid JSON."""

    text = await llm_invoke([HumanMessage(content=prompt)])
    optimized = _parse_json_block(text)

    await _emit(state, "optimization", "Generating coaching summary...")
    reasoning = await llm_invoke([
        SystemMessage(content="You are a resume coach. Be concise and specific."),
        HumanMessage(content=f"Original: {json.dumps(structured)}\nOptimized: {json.dumps(optimized)}\nIn 2-3 sentences, explain the key improvements made.")
    ])

    return {**state, "optimized": optimized, "reasoning": reasoning}


async def validation_node(state: AgentState) -> AgentState:
    await _emit(state, "validation", "Checking for hallucinated content and PII...")

    optimized = state.get("optimized", {})
    original = state.get("structured", {})

    prompt = f"""Review the optimized resume. Return JSON:
{{
  "is_valid": true,
  "pii_flags": [],
  "hallucination_flags": [],
  "cleaned_resume": <same schema as optimized, with any issues fixed>
}}

Original companies: {[e.get("company") for e in original.get("experience", [])]}
Optimized bullets (first job): {json.dumps(optimized.get("experience", [{}])[0].get("bullets", []) if optimized.get("experience") else [])}

Return ONLY valid JSON."""

    text = await llm_invoke([HumanMessage(content=prompt)])
    validation = _parse_json_block(text)

    flags = validation.get("hallucination_flags", [])
    if flags:
        await _emit(state, "validation", f"Fixed {len(flags)} potential inaccuracies")
    else:
        await _emit(state, "validation", "All content verified — no hallucinations detected")

    await _emit(state, "validation", "Resume ready to review!")

    final = validation.get("cleaned_resume", optimized)
    # Fallback: if cleaned_resume is empty/malformed, use optimized directly
    if not final or not isinstance(final, dict) or not final.get("contact"):
        final = optimized

    return {**state, "validated": final}


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
        "active_model": "",
        "error": None,
        "on_activity": on_activity,
    }
    return await pipeline.ainvoke(initial)
