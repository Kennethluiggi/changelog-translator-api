from app.models import TranslateRequest
from app.translator import translate


def test_deterministic_translate_extracts_risk_and_impact():
    req = TranslateRequest(
        raw_text="Added OAuth token rotation. Breaking: old endpoint removed.",
        audience=["cs", "support", "customer"],
        mode="basic",
    )

    res = translate(req)

    assert res.impact_level == "high"
    assert "breaking change" in res.risk_flags
    assert len(res.extracted_changes) >= 1


def test_ai_mock_enrichment_present():
    req = TranslateRequest(
        raw_text="Fixed billing invoice rounding issue.",
        audience=["cs"],
        mode="ai",
    )

    res = translate(req)

    assert res.ai_provider == "mock"
    assert res.ai_enhancement is not None
    assert res.ai_fallback_used is False
