import json
import os
from openai import OpenAI
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
    def __init__(self):
        self.name = "openai"
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.prompt_version = "v1"

    def enhance(self, req: TranslateRequest, base: TranslateResponse) -> AIEnhancement:
        prompt = self._build_prompt(req, base)

        response = self.client.responses.create(
            model=self.model,
            input=prompt,
        )

        content = response.output[0].content[0].text
        print("[AI RAW CONTENT]", content)

        enhancement = AIEnhancement.model_validate_json(content)

        return enhancement

    def _build_prompt(self, req: TranslateRequest, base: TranslateResponse) -> str:
        return f"""
        You are an API that returns ONLY valid JSON.
        Do not include markdown.
        Do not include explanations.
        Return exactly one JSON object matching this schema.

        Changelog:
        {req.raw_text}

        Extracted Changes:
        {base.extracted_changes}

        Risk Flags:
        {base.risk_flags}

        Return JSON in this exact format:
        {{
        "executive_summary": "",
        "impacted_scopes": [],
        "impacted_partners": [],
        "partner_email_draft": ""
        }}
        """


def get_provider() -> AIProvider:
    provider_name = os.getenv("AI_PROVIDER", "mock").strip().lower()
    if provider_name == "openai":
        return OpenAIProvider()
    return MockAIProvider()
