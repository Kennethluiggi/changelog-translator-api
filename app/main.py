import os
from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from .auth import require_api_key, ApiCaller
from .models import TranslateRequest, TranslateResponse
from .translator import translate
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
    return translate(req)




