import os
from fastapi import FastAPI, Body, HTTPException, Depends, status
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

from .auth import require_api_key, ApiCaller
from .models import TranslateRequest, TranslateResponse
from .translator import translate, detect_scopes
from .db import insert_translation_run, fetch_translation_history, fetch_metrics_summary
from .rate_limit import enforce_rate_limit

from app.user_auth import create_user, login_user
from app.apps_api import router as apps_router
from app.partners_api import router as partners_router

load_dotenv()

APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

app = FastAPI(
    title="Changelog Translator API",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(apps_router)
app.include_router(partners_router)


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


@app.post("/app-auth/signup")
def signup(payload: dict = Body(...)):
    try:
        email = payload.get("email")
        password = payload.get("password")
        full_name = payload.get("full_name")
        business_type = payload.get("type")
        business_name = payload.get("business_name")

        if not email or not password or not full_name:
            raise HTTPException(status_code=400, detail="Missing required fields")

        if business_type == "business" and not business_name:
            raise HTTPException(status_code=400, detail="Business name required")

        result = create_user(email, password, full_name, business_name)

        return {
            "success": True,
            "user": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/app-auth/login")
def login(payload: dict = Body(...)):
    try:
        email = payload.get("email")
        password = payload.get("password")

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")

        result = login_user(email, password)

        return {
            "success": True,
            "user": result
        }

    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        if message == "Invalid email or password":
            raise HTTPException(status_code=401, detail=message)
        raise HTTPException(status_code=500, detail=message)


@app.post("/app-auth/forgot-password")
def forgot_password(payload: dict = Body(...)):
    email = payload.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    return {
        "success": True,
        "message": "If an account exists for that email, password reset instructions will be sent."
    }


@app.post("/app-auth/logout")
def logout():
    return {
        "success": True,
        "message": "Logged out"
    }


@app.get("/app-auth/me")
def get_current_user():
    return {
        "success": True,
        "message": "Temporary /me route not wired to sessions yet"
    }