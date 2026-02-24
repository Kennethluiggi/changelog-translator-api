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


def test_ai_mock_oauth_partner_messaging_is_more_executive():
    req = TranslateRequest(
        raw_text=(
            "Changed OAuth token rotation policy. "
            "Deprecated scope auth:legacy and introduced auth:token.rotate. "
            "Breaking: integrations using auth:legacy must migrate by June 30."
        ),
        audience=["cs", "support", "customer"],
        partner_accounts=[
            {"name": "Northstar Bank", "scopes": ["auth:legacy", "payments:read"]},
            {"name": "Acme Payroll", "scopes": ["auth:token.rotate", "profile:read"]},
            {"name": "Orbit HR", "scopes": ["auth:legacy", "employees:read"]},
        ],
        mode="ai",
    )

    res = translate(req)

    assert res.ai_enhancement is not None
    assert "OAuth" in res.ai_enhancement.executive_summary
    assert "Northstar Bank" in res.ai_enhancement.executive_summary
    assert any("partner" in q.lower() for q in res.ai_enhancement.customer_followups)
    assert "Northstar Bank" in res.ai_enhancement.impacted_partners
    assert "Subject: Required OAuth Scope Migration Action" in res.ai_enhancement.partner_email_draft


def test_basic_mode_stays_deterministic_without_ai_draft():
    req = TranslateRequest(
        raw_text=(
            "Changed OAuth token rotation policy. "
            "Deprecated scope auth:legacy and introduced auth:token.rotate. "
            "Breaking: integrations using auth:legacy must migrate by June 30."
        ),
        audience=["cs", "support", "customer"],
        partner_accounts=[
            {"name": "Northstar Bank", "scopes": ["auth:legacy", "payments:read"]},
        ],
        mode="basic",
    )

    res = translate(req)

    assert res.ai_enhancement is None
    assert any("auth:legacy" in q for q in res.follow_up_questions)
