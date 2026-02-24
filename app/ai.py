import json
import os
import re
from dataclasses import dataclass
from typing import Protocol
from urllib import request

from .models import AIEnhancement, TranslateRequest, TranslateResponse
from .partner_catalog import impacted_partners_for_scopes


PROMPT_TEMPLATE = """You are a release communication assistant.
Input changelog:\n{raw_text}\n
Deterministic baseline:\n{baseline}\n
Generate JSON ONLY with keys:
- executive_summary: short paragraph for customer-facing teams
- customer_followups: list of follow-up questions
- adoption_risks: list of likely rollout/adoption risks
- impacted_scopes: list of scopes likely impacted (e.g., auth:legacy)
- impacted_partners: list of partner names likely impacted by scope/auth changes
- partner_email_draft: concise empathetic partner broadcast in Chris Voss style
Tone: {tone}
Persona: {persona}
Constraints: {constraints}
"""


class AIProvider(Protocol):
    name: str

    def enhance(self, req: TranslateRequest, baseline: TranslateResponse) -> AIEnhancement:
        ...


def _extract_scopes(text: str) -> list[str]:
    found = re.findall(r"\b[a-z][a-z0-9_-]*:[a-z0-9_.*-]+\b", text.lower())
    seen = set()
    ordered: list[str] = []
    for scope in found:
        if scope not in seen:
            seen.add(scope)
            ordered.append(scope)
    return ordered


@dataclass
class MockAIProvider:
    name: str = "mock"

    def enhance(self, req: TranslateRequest, baseline: TranslateResponse) -> AIEnhancement:
        raw = req.raw_text
        lower = raw.lower()
        scopes = _extract_scopes(raw)
        impacted_partners = impacted_partners_for_scopes(scopes)

        oauth_context = any(token in lower for token in ["oauth", "token", "sso", "auth"])

        if oauth_context:
            scope_phrase = ", ".join(scopes) if scopes else "authentication scopes"
            partner_phrase = ", ".join(impacted_partners[:8]) if impacted_partners else "integration partners using impacted scopes"
            return AIEnhancement(
                executive_summary=(
                    "This release introduces OAuth scope hardening and token-policy changes that reduce auth abuse risk "
                    "while increasing near-term migration pressure on external integrations. "
                    f"Most likely impacted scopes: {scope_phrase}. "
                    f"Likely impacted partners: {partner_phrase}."
                ),
                customer_followups=[
                    f"Which partner owners are accountable for validating scopes: {scope_phrase}?",
                    "What migration timeline can we confidently communicate without increasing customer anxiety?",
                    "Where do we expect the highest ticket surge if partners delay testing?",
                ],
                adoption_risks=[
                    "Legacy OAuth scope usage can produce partner auth failures after cutoff.",
                    "Partial migration may lead to intermittent 401/403 errors and customer confusion.",
                    "Insufficient partner outreach can increase avoidable escalations during rollout.",
                ],
                impacted_scopes=scopes,
                impacted_partners=impacted_partners,
                partner_email_draft=(
                    "Subject: Quick alignment on upcoming OAuth scope changes\n\n"
                    "Hi Partner Team,\n\n"
                    "It sounds like reliability during this transition matters to you, and we want to make sure you have "
                    "everything needed before enforcement begins. We are updating OAuth token handling and deprecating "
                    "legacy scope paths, which may affect your current integration behavior.\n\n"
                    f"Scopes to validate now: {scope_phrase}.\n"
                    f"This notice is intended for: {partner_phrase}.\n\n"
                    "The good news is most teams can complete validation quickly in staging. If useful, we can walk "
                    "through your migration checklist together and confirm a safe production timeline.\n\n"
                    "Best,\nPartner Engineering"
                ),
            )

        return AIEnhancement(
            executive_summary=(
                "This release introduces operationally meaningful updates with "
                f"{baseline.impact_level} estimated impact. Teams should align customer messaging "
                "to risk flags and support preparation notes."
            ),
            customer_followups=baseline.follow_up_questions[:3],
            adoption_risks=baseline.risk_flags[:3],
            impacted_scopes=scopes,
            impacted_partners=impacted_partners,
            partner_email_draft=(
                "Subject: Product Update Notice\n\n"
                "Hello Partner Team,\n\n"
                "We are sharing an upcoming platform update. Please validate your integration against "
                "the latest release notes in your staging environment.\n\n"
                "Best,\nPartner Engineering"
            ),
        )


@dataclass
class OpenAIProvider:
    name: str = "openai"

    def enhance(self, req: TranslateRequest, baseline: TranslateResponse) -> AIEnhancement:
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required for openai provider")

        prompt = PROMPT_TEMPLATE.format(
            raw_text=req.raw_text,
            baseline=baseline.model_dump_json(indent=2),
            tone=req.tone,
            persona=req.persona or "general",
            constraints=req.constraints or "none",
        )

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "Return strict JSON only."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }
        req_http = request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req_http, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))

        content = body["choices"][0]["message"]["content"]
        return AIEnhancement.model_validate_json(content)


def get_provider() -> AIProvider:
    provider_name = os.getenv("AI_PROVIDER", "mock").strip().lower()
    if provider_name == "openai":
        return OpenAIProvider()
    return MockAIProvider()
