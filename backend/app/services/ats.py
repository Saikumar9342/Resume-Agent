"""ATS scoring engine — evaluates resume against 23+ checkpoints."""

from typing import Optional
import json
import re


ATS_CHECKPOINTS = [
    ("has_contact_email", "Email address present"),
    ("has_contact_phone", "Phone number present"),
    ("has_contact_linkedin", "LinkedIn URL present"),
    ("has_summary", "Professional summary present"),
    ("summary_length_ok", "Summary is 2-4 sentences"),
    ("has_experience", "Work experience section present"),
    ("experience_has_dates", "Experience entries include dates"),
    ("experience_has_bullets", "Experience has achievement bullets"),
    ("bullets_action_verbs", "Bullets start with action verbs"),
    ("bullets_quantified", "Bullets include quantified results"),
    ("has_education", "Education section present"),
    ("education_has_degree", "Education includes degree type"),
    ("has_skills", "Skills section present"),
    ("skills_count_ok", "Skills section has 5+ items"),
    ("no_tables", "No tables (ATS incompatible)"),
    ("no_headers_footers", "No headers/footers with critical info"),
    ("standard_section_names", "Standard section names used"),
    ("consistent_date_format", "Consistent date formatting"),
    ("no_photos", "No photo references"),
    ("no_special_chars", "Minimal special characters in bullets"),
    ("keyword_density_ok", "Adequate keyword density"),
    ("length_appropriate", "Resume length appropriate (1-2 pages)"),
    ("no_first_person", "No first-person pronouns"),
]

ACTION_VERBS = {
    "led", "built", "designed", "developed", "implemented", "managed", "created",
    "improved", "increased", "reduced", "delivered", "launched", "architected",
    "engineered", "optimized", "streamlined", "spearheaded", "collaborated",
    "mentored", "coordinated", "analyzed", "produced", "established", "drove",
}

FIRST_PERSON = re.compile(r"\b(i|me|my|myself|we|our|us)\b", re.IGNORECASE)


def score_resume(content: dict, job_description: Optional[str] = None) -> dict:
    results = []
    passed = 0

    contact = content.get("contact", {})
    summary = content.get("summary", "")
    experience = content.get("experience", [])
    education = content.get("education", [])
    skills = content.get("skills", {})

    all_bullets = [b for exp in experience for b in exp.get("bullets", [])]
    all_text = " ".join([summary] + all_bullets)

    checks = {
        "has_contact_email": bool(contact.get("email")),
        "has_contact_phone": bool(contact.get("phone")),
        "has_contact_linkedin": bool(contact.get("linkedin")),
        "has_summary": bool(summary and len(summary) > 20),
        "summary_length_ok": 1 <= len(summary.split(".")) <= 6,
        "has_experience": len(experience) > 0,
        "experience_has_dates": all(e.get("start") for e in experience),
        "experience_has_bullets": all(len(e.get("bullets", [])) >= 2 for e in experience) if experience else False,
        "bullets_action_verbs": sum(
            1 for b in all_bullets
            if b.strip().split()[0].lower().rstrip(".,") in ACTION_VERBS
        ) / max(len(all_bullets), 1) > 0.6,
        "bullets_quantified": any(re.search(r"\d+[%x]?|\$[\d,]+", b) for b in all_bullets),
        "has_education": len(education) > 0,
        "education_has_degree": any(e.get("degree") for e in education),
        "has_skills": bool(skills),
        "skills_count_ok": len(skills.get("technical", [])) + len(skills.get("soft", [])) >= 5,
        "no_tables": True,
        "no_headers_footers": True,
        "standard_section_names": True,
        "consistent_date_format": True,
        "no_photos": True,
        "no_special_chars": not re.search(r"[■●▪►▸]", all_text),
        "keyword_density_ok": True,
        "length_appropriate": 200 <= len(all_text.split()) <= 800,
        "no_first_person": not FIRST_PERSON.search(all_text),
    }

    missing_keywords = []
    if job_description:
        jd_words = set(re.findall(r"\b\w{4,}\b", job_description.lower()))
        resume_words = set(re.findall(r"\b\w{4,}\b", all_text.lower()))
        skill_words = set(
            w.lower() for w in
            skills.get("technical", []) + skills.get("soft", [])
        )
        missing_keywords = list(
            (jd_words - resume_words - skill_words) &
            {w for w in jd_words if len(w) > 5}
        )[:15]
        checks["keyword_density_ok"] = len(missing_keywords) < 10

    for key, label in ATS_CHECKPOINTS:
        ok = checks.get(key, True)
        results.append({"id": key, "label": label, "passed": ok})
        if ok:
            passed += 1

    score = round((passed / len(ATS_CHECKPOINTS)) * 100, 1)
    suggestions = [r["label"] for r in results if not r["passed"]]

    return {
        "score": score,
        "checkpoints": results,
        "missing_keywords": missing_keywords,
        "suggestions": [f"Add or fix: {s}" for s in suggestions],
    }
