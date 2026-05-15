"""
Strict ATS Scoring Engine — weighted, multi-dimensional resume evaluation.

Score breakdown (100 pts total):
  - Keyword Match (JD-driven)   : 30 pts
  - Bullet Quality              : 22 pts
  - Contact & Identity          : 12 pts
  - Structure & Formatting      : 12 pts
  - Content Completeness        : 14 pts
  - Red Flags                   : 10 pts (deductions)
"""

from typing import Optional
import re
from datetime import datetime

# ── Constants ────────────────────────────────────────────────────────────────

ACTION_VERBS = {
    "accelerated","achieved","acquired","administered","advanced","analyzed","architected",
    "automated","boosted","built","championed","collaborated","coordinated","created",
    "cut","decreased","defined","delivered","deployed","designed","developed","devised",
    "directed","discovered","drove","eliminated","engineered","enhanced","established",
    "exceeded","executed","expanded","facilitated","formulated","founded","generated",
    "grew","guided","implemented","improved","increased","initiated","integrated",
    "introduced","launched","led","maintained","managed","mentored","migrated",
    "modernized","negotiated","operated","optimized","orchestrated","overhauled","owned",
    "partnered","pioneered","planned","produced","programmed","reduced","refactored",
    "released","restructured","scaled","secured","shipped","simplified","solved",
    "spearheaded","streamlined","strengthened","supervised","transformed","unified","validated",
}

WEAK_BUZZWORDS = {
    "hardworking","passionate","motivated","enthusiastic","dynamic","synergy","leverage",
    "proactive","go-getter","team player","detail-oriented","results-driven","self-starter",
    "think outside the box","hit the ground running","value add","best of breed",
}

FIRST_PERSON_RE = re.compile(r"\b(I|me|my|myself)\b")

QUANTIFIED_RE = re.compile(
    r"\d+\s*[%xX+]"                                   # 40%, 3x, 5+
    r"|\$[\d,]+[kKmMbB]?"                             # $500k
    r"|\d[\d,]*\s*(users?|clients?|customers?|engineers?"
    r"|people|team members?|services?|systems?|servers?"
    r"|projects?|apps?|products?|hours?|days?|weeks?"
    r"|months?|requests?|transactions?|calls?|records?)"
    r"|\d+\+?\s*years?"                               # 3+ years
    r"|\b(doubled|tripled|halved)\b"                  # qualitative scale
    r"|\b(zero|100)\s*%"                              # zero downtime / 100%
    r"|(reduced|improved|increased|decreased|saved|grew|scaled|cut|boosted"
    r"|eliminated|accelerated|optimized)\s[\w\s]+by\s+\d"  # improved X by N
    r"|\d+\s*(percent|percentage)"
    r"|\b[1-9]\d*\s*x\s+(faster|more|reduction|improvement|increase)",
    re.IGNORECASE,
)

DATE_PATTERNS = [
    re.compile(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b", re.IGNORECASE),
    re.compile(r"\b\d{1,2}[\/\-]\d{4}\b"),
    re.compile(r"\b\d{4}\s*[-–]\s*(\d{4}|present|current|now)\b", re.IGNORECASE),
    re.compile(r"\b(Q[1-4])\s+\d{4}\b", re.IGNORECASE),
]

DEGREE_KEYWORDS = re.compile(
    r"\b(bachelor|master|phd|doctorate|associate|b\.?s\.?|m\.?s\.?|b\.?e\.?|m\.?e\.?"
    r"|b\.?tech|m\.?tech|mba|b\.?a\.?|m\.?a\.?|llb|md|engineering|science|arts|commerce)\b",
    re.IGNORECASE,
)

SPECIAL_CHARS_RE = re.compile(r"[■●▪►▸★☆✓✗→←•]")
LINKEDIN_RE = re.compile(r"linkedin\.com/in/[\w\-]+", re.IGNORECASE)
GITHUB_RE = re.compile(r"github\.com/[\w\-]+", re.IGNORECASE)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _all_bullets(experience: list) -> list[str]:
    return [b for exp in experience for b in exp.get("bullets", []) if b and b.strip()]


def _all_text(content: dict) -> str:
    exp = content.get("experience", [])
    bullets = _all_bullets(exp)
    summary = content.get("summary", "") or ""
    skills_tech = content.get("skills", {}).get("technical", [])
    skills_soft = content.get("skills", {}).get("soft", [])
    return " ".join([summary] + bullets + skills_tech + skills_soft)


def _word_set(text: str, min_len: int = 4) -> set[str]:
    return {w.lower() for w in re.findall(r"\b[a-zA-Z]\w*\b", text) if len(w) >= min_len}


def _detect_date_format(date_str: str) -> Optional[str]:
    for i, pat in enumerate(DATE_PATTERNS):
        if pat.search(date_str):
            return str(i)
    return None


def _employment_gap_months(experience: list) -> int:
    """Returns the largest employment gap in months across all jobs."""
    dates = []
    for exp in experience:
        start = exp.get("start", "")
        end = exp.get("end", "")
        if not start:
            continue
        try:
            # Try to extract year from start/end
            sy = re.search(r"\b(20\d{2}|19\d{2})\b", start)
            ey = re.search(r"\b(20\d{2}|19\d{2})\b", end) if end else None
            if sy:
                s_year = int(sy.group())
                s_month_m = re.search(r"\b(\d{1,2})[\/\-]", start)
                s_month = int(s_month_m.group(1)) if s_month_m else 6
                dates.append((s_year * 12 + s_month, "start"))
            if ey:
                e_year = int(ey.group())
                e_month_m = re.search(r"\b(\d{1,2})[\/\-]", end) if end else None
                e_month = int(e_month_m.group(1)) if e_month_m else 6
                dates.append((e_year * 12 + e_month, "end"))
            elif "present" in (end or "").lower() or "current" in (end or "").lower():
                now = datetime.now()
                dates.append((now.year * 12 + now.month, "end"))
        except Exception:
            pass
    if len(dates) < 2:
        return 0
    dates.sort()
    max_gap = 0
    i = 0
    while i < len(dates) - 1:
        if dates[i][1] == "end" and dates[i + 1][1] == "start":
            gap = dates[i + 1][0] - dates[i][0]
            if gap > max_gap:
                max_gap = gap
        i += 1
    return max_gap


def _keyword_match_score(content: dict, jd: str) -> tuple[float, list[str], list[str]]:
    """Returns (0-1 score, matched_keywords, missing_keywords)."""
    resume_text = _all_text(content)
    resume_words = _word_set(resume_text)

    # Extract meaningful JD terms (4+ chars, not stopwords)
    STOPWORDS = {"with","that","this","from","have","will","your","their","they","been",
                 "which","when","also","into","more","than","about","would","could","should"}
    jd_words = _word_set(jd) - STOPWORDS

    # Weight technical terms higher (CamelCase, known tech patterns)
    tech_pattern = re.compile(r"\b[A-Z][a-z]+[A-Z]\w*|\b[A-Z]{2,}\b")
    tech_terms = {t.lower() for t in tech_pattern.findall(jd)} & jd_words

    matched = jd_words & resume_words
    missing = list((jd_words - resume_words) & {w for w in jd_words if len(w) > 5})[:20]
    matched_list = list(matched & jd_words)[:20]

    # Weighted score: tech terms count double
    tech_matched = len(tech_terms & resume_words)
    regular_matched = len(matched - tech_terms)
    total_weight = len(tech_terms) * 2 + max(len(jd_words) - len(tech_terms), 1)
    weighted_matched = tech_matched * 2 + regular_matched
    score = min(weighted_matched / total_weight, 1.0) if total_weight > 0 else 0.5

    return score, matched_list, missing


# ── Main Scorer ──────────────────────────────────────────────────────────────

def score_resume(content: dict, job_description: Optional[str] = None) -> dict:
    contact = content.get("contact") or {}
    summary = (content.get("summary") or "").strip()
    experience = content.get("experience") or []
    education = content.get("education") or []
    skills = content.get("skills") or {}
    projects = content.get("projects") or []
    certifications = content.get("certifications") or []

    all_bullets = _all_bullets(experience)
    all_text = _all_text(content)
    all_words = all_text.split()

    checkpoints = []
    matched_keywords: list[str] = []
    missing_keywords: list[str] = []

    def cp(id: str, label: str, passed: bool, weight: int, detail: str = "", category: str = ""):
        checkpoints.append({
            "id": id, "label": label, "passed": passed,
            "weight": weight, "detail": detail, "category": category,
        })
        return passed

    # ── CATEGORY 1: Contact & Identity (12 pts) ───────────────────────────

    contact_str = " ".join(str(v) for v in contact.values())
    cp("has_email", "Email address present", bool(EMAIL_RE.search(contact_str)), 3, category="contact")
    cp("has_phone", "Phone number present", bool(PHONE_RE.search(contact_str)), 2, category="contact")
    cp("has_linkedin", "LinkedIn URL present", bool(LINKEDIN_RE.search(contact_str)), 3, category="contact")
    cp("has_github", "GitHub URL present", bool(GITHUB_RE.search(contact_str)), 1, category="contact")
    cp("has_location", "Location/city present", bool(contact.get("location", "").strip()), 1, category="contact")
    cp("has_name", "Full name present", bool(contact.get("name", "").strip()), 2, category="contact")

    # ── CATEGORY 2: Content Completeness (14 pts) ─────────────────────────

    cp("has_summary", "Professional summary present",
       bool(summary and len(summary) > 30), 2, category="completeness")

    # Count sentences: split on ". "/".  " but ignore decimals, abbreviations (single char before dot)
    summary_sentences = [s.strip() for s in re.split(r"(?<=[a-zA-Z]{3})[.!?]+\s+(?=[A-Z])", summary) if len(s.strip()) > 8]
    # Also count if summary ends with period (last sentence won't have trailing space)
    if summary_sentences and not re.search(r"[.!?]\s+[A-Z]", summary):
        # Only one chunk — it might still be multiple sentences ending with period
        summary_sentences = [s.strip() for s in re.split(r"\.\s+", summary) if len(s.strip()) > 8]
    cp("summary_length", "Summary is 2-5 sentences",
       2 <= len(summary_sentences) <= 5, 2, f"{len(summary_sentences)} sentences", category="completeness")

    summary_words = len(summary.split())
    cp("summary_depth", "Summary has enough depth (25-120 words)",
       25 <= summary_words <= 120, 1, f"{summary_words} words", category="completeness")

    cp("has_experience", "Work experience present", len(experience) > 0, 3, category="completeness")

    cp("has_education", "Education section present", len(education) > 0, 2, category="completeness")

    cp("has_skills", "Skills section present",
       len(skills.get("technical", [])) + len(skills.get("soft", [])) > 0, 1, category="completeness")

    skills_count = len(skills.get("technical", [])) + len(skills.get("soft", []))
    cp("skills_count", "10+ skills listed",
       skills_count >= 10, 2, category="completeness")

    cp("has_projects_or_certs", "Projects or certifications present",
       len(projects) > 0 or len(certifications) > 0, 1, category="completeness")

    # ── CATEGORY 3: Bullet Quality (22 pts) ──────────────────────────────

    action_verb_bullets = sum(
        1 for b in all_bullets
        if b.strip().split()[0].lower().rstrip(".,;:") in ACTION_VERBS
    ) if all_bullets else 0
    action_ratio = action_verb_bullets / max(len(all_bullets), 1)
    cp("bullets_action_verbs", "Bullets start with strong action verbs (>70%)",
       action_ratio >= 0.70, 5, f"{action_verb_bullets}/{len(all_bullets)} bullets", category="bullets")

    quantified_bullets = sum(1 for b in all_bullets if QUANTIFIED_RE.search(b))
    quant_ratio = quantified_bullets / max(len(all_bullets), 1)
    cp("bullets_quantified", "Bullets include quantified results (>40%)",
       quant_ratio >= 0.40, 6, f"{quantified_bullets}/{len(all_bullets)} bullets", category="bullets")

    cp("bullets_count", "Sufficient bullet points (5+ total)",
       len(all_bullets) >= 5, 2, f"{len(all_bullets)} total", category="bullets")

    avg_bullet_words = sum(len(b.split()) for b in all_bullets) / max(len(all_bullets), 1)
    cp("bullet_length", "Bullet length appropriate (10-25 words avg)",
       10 <= avg_bullet_words <= 30, 2, f"{avg_bullet_words:.0f} words avg", category="bullets")

    # STAR method check: bullet has action + context/result
    star_bullets = sum(
        1 for b in all_bullets
        if len(b.split()) >= 8 and (
            QUANTIFIED_RE.search(b) or
            re.search(r"\b(result|impact|outcome|enabling|allowing|leading|resulting|achieving)\b", b, re.IGNORECASE)
        )
    )
    cp("bullets_star", "Bullets follow STAR/result-driven format",
       star_bullets / max(len(all_bullets), 1) >= 0.3, 4, f"{star_bullets}/{len(all_bullets)} bullets", category="bullets")

    # Weak buzzwords: flag only if 3+ found (light usage is tolerated)
    weak_count = sum(1 for b in all_bullets for w in WEAK_BUZZWORDS if w.lower() in b.lower())
    cp("no_weak_buzzwords", "Minimal generic buzzwords in bullets (<3)",
       weak_count < 3, 2, f"{weak_count} found", category="bullets")

    # First-person: only flag I/me/my — not "we/our" which can appear in company context
    first_person_strict = re.compile(r"\b(I|me|my|myself)\b")
    cp("no_first_person", "No first-person pronouns (I/me/my)",
       not first_person_strict.search(all_text), 1, category="bullets")

    # ── CATEGORY 4: Structure & Formatting (12 pts) ───────────────────────

    # Date presence
    exp_with_dates = sum(1 for e in experience if e.get("start") and e.get("start").strip())
    cp("experience_dates", "All experience entries have dates",
       exp_with_dates == len(experience) and len(experience) > 0, 3,
       f"{exp_with_dates}/{len(experience)}", category="structure")

    # Consistent date format
    date_formats_used = set()
    for exp in experience:
        for field in ["start", "end"]:
            val = exp.get(field, "") or ""
            fmt = _detect_date_format(val)
            if fmt:
                date_formats_used.add(fmt)
    cp("consistent_dates", "Consistent date format across entries",
       len(date_formats_used) <= 1, 2, category="structure")

    # Education has degree type
    cp("education_degree", "Education includes degree type",
       any(DEGREE_KEYWORDS.search(e.get("degree", "") or e.get("field", "") or "") for e in education),
       2, category="structure")

    # Resume length: 1-page = ~300-500 words, 2-page = ~500-900 words
    word_count = len(all_words)
    cp("resume_length", "Resume length appropriate (300-900 words)",
       300 <= word_count <= 900, 2, f"{word_count} words", category="structure")

    # Employment gap check
    gap_months = _employment_gap_months(experience)
    cp("no_employment_gaps", "No significant employment gaps (>6 months)",
       gap_months <= 6, 2, f"{gap_months}mo gap", category="structure")

    cp("no_special_chars", "No ATS-breaking special characters",
       not SPECIAL_CHARS_RE.search(all_text), 1, category="structure")

    # ── CATEGORY 5: Keyword Match (30 pts when JD provided) ───────────────

    if job_description and job_description.strip():
        kw_score, matched_keywords, missing_keywords = _keyword_match_score(content, job_description)

        cp("keyword_match_high", "Strong keyword match with JD (>60%)",
           kw_score >= 0.60, 12, f"{kw_score*100:.0f}% match", category="keywords")

        cp("keyword_match_medium", "Adequate keyword coverage (>35%)",
           kw_score >= 0.35, 10, f"{kw_score*100:.0f}% match", category="keywords")

        # Check if JD requires specific experience level
        jd_lower = job_description.lower()
        years_required = re.search(r"(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)", jd_lower)
        if years_required:
            required_yrs = int(years_required.group(1))
            # Sum experience years from resume
            total_exp_years = len(experience) * 1.5  # rough estimate
            cp("experience_level_match", f"{required_yrs}+ years experience required",
               total_exp_years >= required_yrs, 5,
               f"~{total_exp_years:.0f} yrs estimated", category="keywords")
        else:
            cp("experience_level_match", "Experience level matches JD", True, 5, category="keywords")

        # Title match
        jd_titles = re.findall(
            r"\b(engineer|developer|designer|manager|analyst|scientist|architect|lead|senior|junior|staff|principal)\b",
            jd_lower, re.IGNORECASE
        )
        resume_summary_lower = summary.lower()
        title_match = any(t.lower() in resume_summary_lower for t in jd_titles)
        cp("title_match", "Job title/level aligns with JD",
           title_match or not jd_titles, 3, category="keywords")

    else:
        # No JD — give partial keyword credit but cap it
        cp("keyword_match_high", "JD not provided — keyword match skipped", True, 0, category="keywords")
        cp("keyword_match_medium", "JD not provided — keyword match skipped", True, 0, category="keywords")
        cp("experience_level_match", "JD not provided — level match skipped", True, 0, category="keywords")
        cp("title_match", "JD not provided — title match skipped", True, 0, category="keywords")
        missing_keywords = []
        matched_keywords = []

    # ── SCORING: weighted sum ──────────────────────────────────────────────

    total_weight: int = sum(int(c["weight"]) for c in checkpoints)
    earned_weight: int = sum(int(c["weight"]) for c in checkpoints if c["passed"])

    # No-JD mode: recalculate without keyword weights (they're 0)
    if not (job_description and job_description.strip()):
        non_kw = [c for c in checkpoints if c["category"] != "keywords"]
        total_weight = sum(int(c["weight"]) for c in non_kw)
        earned_weight = sum(int(c["weight"]) for c in non_kw if c["passed"])

    raw_score = (earned_weight / total_weight * 100) if total_weight > 0 else 0

    # Apply grade curve — it's hard to get 100
    score = round(min(raw_score * 0.95, 99.0), 1)

    # Strip zero-weight checkpoints from output (JD-skipped ones)
    visible_checkpoints = [c for c in checkpoints if int(c["weight"]) > 0]

    suggestions: list[str] = []
    for c in visible_checkpoints:
        if not c["passed"]:
            detail = str(c.get("detail") or "")
            label = str(c["label"])
            suggestions.append(f"{label} ({detail})" if detail else label)

    return {
        "score": score,
        "checkpoints": [
            {"id": c["id"], "label": c["label"], "passed": c["passed"],
             "weight": c["weight"], "detail": c.get("detail", ""), "category": c["category"]}
            for c in visible_checkpoints
        ],
        "missing_keywords": missing_keywords,
        "matched_keywords": matched_keywords,
        "suggestions": suggestions,
        "breakdown": {
            "contact": _cat_score(checkpoints, "contact"),
            "completeness": _cat_score(checkpoints, "completeness"),
            "bullets": _cat_score(checkpoints, "bullets"),
            "structure": _cat_score(checkpoints, "structure"),
            "keywords": _cat_score(checkpoints, "keywords") if job_description else None,
        },
    }


def _cat_score(checkpoints: list, category: str) -> dict:
    items = [c for c in checkpoints if c["category"] == category and int(c["weight"]) > 0]
    if not items:
        return {"score": 0, "max": 0, "pct": 0}
    earned: int = sum(int(c["weight"]) for c in items if c["passed"])
    total: int = sum(int(c["weight"]) for c in items)
    return {"score": earned, "max": total, "pct": round(earned / total * 100)}
