import json
import os
import re
from dataclasses import dataclass
from typing import Protocol
from urllib import request

from .models import AIEnhancement, TranslateRequest, TranslateResponse


PROMPT_TEMPLATE = """You are a release communication assistant.
Input changelog:\n{raw_text}\n
Deterministic baseline:\n{baseline}\n
Generate JSON ONLY with keys:
- executive_summary: short paragraph for customer-facing teams
- customer_followups: list of follow-up questions
- adoption_risks: list of likely rollout/adoption risks
Tone: {tone}
Persona: {persona}
Constraints: {constraints}
"""


class AIProvider(Protocol):
    name: str

    def enhance(self, req: TranslateRequest, baseline: TranslateResponse) -> AIEnhancement:
        ...


@dataclass
class MockAIProvider:
    name: str = "mock"

    def enhance(self, req: TranslateRequest, baseline: TranslateResponse) -> AIEnhancement:
        raw = req.raw_text
        lower = raw.lower()

        partner_count_match = re.search(r"(\d+)\s+partners?", lower)
        partner_count = int(partner_count_match.group(1)) if partner_count_match else None

        partner_names: list[str] = []
        names_match = re.search(r"partners?\s*[:\-]\s*([^\.\n]+)", raw, flags=re.IGNORECASE)
        if names_match:
            partner_names = [n.strip() for n in names_match.group(1).split(",") if n.strip()]

        oauth_context = any(token in lower for token in ["oauth", "token", "sso", "auth"])

        if oauth_context:
            partner_scope = "multiple partner integrations"
            if partner_count is not None and partner_names:
                partner_scope = f"{partner_count} partner integrations ({', '.join(partner_names[:3])})"
            elif partner_count is not None:
                partner_scope = f"{partner_count} partner integrations"
            elif partner_names:
                partner_scope = f"partner integrations ({', '.join(partner_names[:3])})"

            executive_summary = (
                "This OAuth security hardening release modernizes authentication flows and narrows "
                "token misuse risk by enforcing stronger token lifecycle controls. "
                f"Operationally, this may affect {partner_scope} that rely on the prior auth pattern. "
                "Customer-facing teams should proactively communicate migration timing, expected sign-in "
                "behavior changes, and support readiness for integration owners."
            )

            followups = [
                "Which partners are still using legacy OAuth token endpoints?",
                "Have partner engineering teams validated refresh-token rotation handling in staging?",
                "Do support teams have a partner-specific rollback and escalation contact matrix?",
            ]
            if partner_names:
                followups.insert(0, f"Confirm outreach status for partner accounts: {', '.join(partner_names[:5])}.")

            adoption_risks = [
                "Partner integrations on deprecated OAuth paths may fail authentication.",
                "Token rotation timing mismatches can produce intermittent 401/403 auth errors.",
                "Delayed partner testing could increase launch-week support volume.",
            ]
            return AIEnhancement(
                executive_summary=executive_summary,
                customer_followups=followups,
                adoption_risks=adoption_risks,
            )

        return AIEnhancement(
            executive_summary=(
                "This release introduces operationally meaningful updates with "
                f"{baseline.impact_level} estimated impact. Teams should align customer messaging "
                "to risk flags and support preparation notes."
            ),
            customer_followups=baseline.follow_up_questions[:3],
            adoption_risks=baseline.risk_flags[:3],
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
