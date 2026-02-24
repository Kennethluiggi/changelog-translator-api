import json
import os
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
