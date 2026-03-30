import os
from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from .auth import require_api_key, ApiCaller
from .models import TranslateRequest, TranslateResponse
from .translator import translate, detect_scopes
from .db import insert_translation_run, fetch_translation_history, fetch_metrics_summary
from .rate_limit import enforce_rate_limit


load_dotenv()

APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

app = FastAPI(
    title="Changelog Translator API",
    version=APP_VERSION,
)

@app.get("/health")
def health(caller: ApiCaller = Depends(require_api_key)):
    enforce_rate_limit(caller.api_key, caller.plan)
    
    return {"status": "ok"}

@app.get("/version")
def version(caller: ApiCaller = Depends(require_api_key)):
    enforce_rate_limit(caller.api_key, caller.plan)

    return {"version": APP_VERSION}

@app.post("/v1/translate", response_model=TranslateResponse)
def translate_v1(req: TranslateRequest, caller: ApiCaller = Depends(require_api_key)):
    enforce_rate_limit(caller.api_key, caller.plan)

    if req.mode == "ai" and caller.plan != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI mode requires a PRO API key",
        )

    response = translate(req)

    try:
        insert_translation_run({
            "status": "success",
            "mode": req.mode,
            "plan": caller.plan,
            "raw_text": req.raw_text,
            "product_area": req.product_area,
            "tone": req.tone,
            "impact_level": response.impact_level,
            "risk_flags": response.risk_flags,
            "detected_scopes": detect_scopes(req.raw_text),
            "ai_provider": response.ai_provider,
            "ai_fallback_used": response.ai_fallback_used,
            "response_json": response.model_dump(mode="json"),
            "error_message": None,
            "ai_model": getattr(response, "ai_model", None),
            "ai_prompt_version": getattr(response, "ai_prompt_version", None),
            "ai_error_message": getattr(response, "ai_error_message", None),
        })
    except Exception as e:
        print(f"[DB LOGGING ERROR] {e}")

 
    return response

@app.get("/v1/history")
def get_history(limit: int = 10, caller: ApiCaller = Depends(require_api_key)):
    enforce_rate_limit(caller.api_key, caller.plan)
    return fetch_translation_history(limit)


@app.get("/v1/metrics/summary")
def get_metrics_summary(caller: ApiCaller = Depends(require_api_key)):
    enforce_rate_limit(caller.api_key, caller.plan)
    return fetch_metrics_summary()