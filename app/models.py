from typing import List, Optional, Literal
from pydantic import BaseModel, Field

Audience = Literal["cs", "support", "customer"]
Tone = Literal["neutral", "friendly", "direct"]
ChangeType = Literal["added", "changed", "fixed", "deprecated", "security"]
ImpactLevel = Literal["low", "medium", "high"]
Mode = Literal["basic", "ai"]
Persona = Literal["cs", "support", "customer", "tam", "pm", "marketing", "legal"]


class TranslateRequest(BaseModel):
    raw_text: str = Field(..., min_length=1, description="Raw changelog text from engineering.")
    audience: List[Audience] = Field(..., min_length=1, description="Which audiences to generate outputs for.")
    tone: Tone = Field("neutral", description="Output tone.")
    product_area: Optional[str] = Field(None, description="Optional product area label (e.g., Billing, Auth, Mobile).")
    constraints: Optional[str] = Field(None, description="Optional constraints (e.g., 'no jargon', 'bullet points').")
    mode: Mode = Field("basic", description="basic = rule-based, ai = AI-enhanced (pro only)")
    persona: Optional[Persona] = Field(None, description="Persona targeting (used by AI mode)")


class ExtractedChange(BaseModel):
    type: ChangeType
    area: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)


class AIEnhancement(BaseModel):
    executive_summary: str = Field(..., min_length=1)
    customer_followups: List[str] = Field(default_factory=list)
    adoption_risks: List[str] = Field(default_factory=list)
    impacted_scopes: List[str] = Field(default_factory=list)
    impacted_partners: List[str] = Field(default_factory=list)
    partner_email_draft: str = Field(..., min_length=1)


class TranslateResponse(BaseModel):
    cs_summary: List[str] = Field(default_factory=list)
    support_notes: List[str] = Field(default_factory=list)
    customer_summary: List[str] = Field(default_factory=list)
    risk_flags: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    extracted_changes: List[ExtractedChange] = Field(default_factory=list)
    impact_level: ImpactLevel = "low"
    ai_enhancement: Optional[AIEnhancement] = None
    ai_provider: Optional[str] = None
    ai_fallback_used: bool = False
