import os
from dataclasses import dataclass
from typing import Set
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Header, HTTPException, status

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"  # project-root/.env
load_dotenv(dotenv_path=ENV_PATH)



@dataclass(frozen=True)
class ApiCaller:
    api_key: str
    plan: str  # "free" or "pro"


def _parse_keys(env_value: str | None) -> Set[str]:
    if not env_value:
        return set()
    return {k.strip() for k in env_value.split(",") if k.strip()}


FREE_KEYS = _parse_keys(os.getenv("FREE_API_KEYS"))
PRO_KEYS = _parse_keys(os.getenv("PRO_API_KEYS"))

#print("DEBUG FREE_KEYS =", FREE_KEYS)
#print("DEBUG PRO_KEYS  =", PRO_KEYS)


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> ApiCaller:
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )

    if x_api_key in PRO_KEYS:
        return ApiCaller(api_key=x_api_key, plan="pro")

    if x_api_key in FREE_KEYS:
        return ApiCaller(api_key=x_api_key, plan="free")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
    )
