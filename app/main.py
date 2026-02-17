import os
from fastapi import FastAPI
from dotenv import load_dotenv

from .models import TranslateRequest, TranslateResponse
from .translator import translate

load_dotenv()

APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

app = FastAPI(
    title="Changelog Translator API",
    version=APP_VERSION,
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/version")
def version():
    return {"version": APP_VERSION}

@app.post("/v1/translate", response_model=TranslateResponse)
def translate_v1(req: TranslateRequest):
    return translate(req)