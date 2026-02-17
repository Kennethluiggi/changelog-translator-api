import re
from typing import List
from .models import (
    TranslateRequest,
    TranslateResponse,
    ExtractedChange,
)


CHANGE_KEYWORDS = {
    "added": ["added", "introduce", "new feature"],
    "changed": ["changed", "updated", "modified"],
    "fixed": ["fixed", "resolved", "bugfix"],
    "deprecated": ["deprecated", "sunset", "removed"],
    "security": ["security", "vulnerability", "patched"],
}

RISK_KEYWORDS = {
    "breaking change": ["breaking", "incompatible"],
    "authentication impact": ["auth", "oauth", "token", "permission"],
    "billing impact": ["billing", "invoice", "subscription", "payment"],
    "downtime risk": ["downtime", "outage"],
    "migration required": ["migration", "migrate"],
    "rate limit impact": ["rate limit", "throttle"],
}

AREA_KEYWORDS = {
    "Auth": ["auth", "oauth", "token", "login", "sso"],
    "Billing": ["billing", "invoice", "subscription", "payment", "checkout"],
    "API": ["api", "endpoint", "version", "v1", "v2", "schema"],
    "Permissions": ["permission", "role", "rbac", "access"],
    "UI": ["ui", "dashboard", "page", "button", "modal"],
    "Performance": ["latency", "performance", "timeout", "slow"],
    "Security": ["security", "vulnerability", "cve", "patched"],
}

def infer_area(line: str) -> str:
    lower = line.lower()
    for area, keys in AREA_KEYWORDS.items():
        if any(k in lower for k in keys):
            return area
    return "General"


def impact_from_risks(risks: List[str]) -> str:
    # High impact signals
    high = {"breaking change", "downtime risk", "migration required"}
    if any(r in high for r in risks):
        return "high"

    # Medium impact signals
    medium = {"authentication impact", "billing impact", "rate limit impact"}
    if any(r in medium for r in risks):
        return "medium"

    return "low"


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def split_into_lines(text: str) -> List[str]:
    # Split on newline first
    lines = text.split("\n")

    # Then split large sentences by period if they contain multiple changes
    final_lines = []
    for line in lines:
        parts = re.split(r"\.\s+", line)
        for part in parts:
            clean = part.strip().strip(".")
            if clean:
                final_lines.append(clean)

    return final_lines



def detect_change_type(line: str) -> str:
    lower_line = line.lower()
    for change_type, keywords in CHANGE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in lower_line:
                return change_type
    return "changed"


def detect_risks(text: str) -> List[str]:
    risks_found = []
    lower_text = text.lower()

    for risk_label, keywords in RISK_KEYWORDS.items():
        for keyword in keywords:
            if keyword in lower_text:
                risks_found.append(risk_label)
                break

    return risks_found


def extract_changes(lines: List[str], product_area: str | None) -> List[ExtractedChange]:
    extracted = []

    for line in lines:
        change_type = detect_change_type(line)
        cleaned = re.sub(r"^(added|fixed|changed|deprecated|security|breaking change)\s*:?\s*",
                        "",
                        line,
                         flags=re.IGNORECASE,
                        )


        extracted.append(
            ExtractedChange(
            type=change_type,
            area=product_area or infer_area(line),
            description=cleaned,
            )
        )

    return extracted


def build_cs_summary(extracted: List[ExtractedChange]) -> List[str]:
    bullets = []
    for change in extracted:
        bullets.append(
            f"{change.type.capitalize()} — {change.area}: {change.description}"
        )
    return bullets


def build_support_notes(extracted: List[ExtractedChange]) -> List[str]:
    notes = []
    for change in extracted:
        notes.append(
            f"Support awareness — {change.description}"
        )
    return notes


def build_customer_summary(extracted: List[ExtractedChange]) -> List[str]:
    summary = []
    for change in extracted:
        if change.type == "fixed":
            summary.append(f"Fix: {change.description}")
        elif change.type == "security":
            summary.append("Security improvements applied.")
        else:
            summary.append(f"Update: {change.description}")
    return summary



def build_follow_up_questions(risks: List[str]) -> List[str]:
    questions = []

    if "breaking change" in risks:
        questions.append("Do customers need advance notice?")
    if "authentication impact" in risks:
        questions.append("Are any customers using custom auth configurations?")
    if "billing impact" in risks:
        questions.append("Does finance need to validate billing behavior?")

    return questions


def translate(req: TranslateRequest) -> TranslateResponse:
    # 1) Preserve structure by splitting first
    lines = split_into_lines(req.raw_text)

    # 2) Normalize each line independently
    lines = [normalize_text(line) for line in lines]

    # 3) Use a normalized full-text string only for risk scanning
    normalized_text = normalize_text(req.raw_text)

    extracted = extract_changes(lines, req.product_area)
    risks = detect_risks(normalized_text)
    impact_level = impact_from_risks(risks)


    return TranslateResponse(
        cs_summary=build_cs_summary(extracted) if "cs" in req.audience else [],
        support_notes=build_support_notes(extracted) if "support" in req.audience else [],
        customer_summary=build_customer_summary(extracted) if "customer" in req.audience else [],
        risk_flags=risks,
        follow_up_questions=build_follow_up_questions(risks),
        extracted_changes=extracted,
        impact_level=impact_level,
    )

