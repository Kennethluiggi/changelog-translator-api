import time
from dataclasses import dataclass
from typing import Dict, Tuple

from fastapi import HTTPException, status


@dataclass(frozen=True)
class RateLimitConfig:
    limit: int
    window_seconds: int


# MVP defaults (adjust later)
FREE_LIMIT = RateLimitConfig(limit=60, window_seconds=60)   # 60 requests per 60 seconds
PRO_LIMIT = RateLimitConfig(limit=300, window_seconds=60)   # 300 requests per 60 seconds

# api_key -> (window_start_epoch_seconds, request_count)
_BUCKETS: Dict[str, Tuple[float, int]] = {}


def enforce_rate_limit(api_key: str, plan: str) -> None:
    """
    Fixed-window rate limiting (MVP):
    - Count requests per api_key within a time window
    - Reset count when window expires
    """
    cfg = PRO_LIMIT if plan == "pro" else FREE_LIMIT

    now = time.time()
    window_start, count = _BUCKETS.get(api_key, (now, 0))

    # Reset the window if expired
    if now - window_start >= cfg.window_seconds:
        window_start, count = now, 0

    count += 1
    _BUCKETS[api_key] = (window_start, count)

    # Enforce limit
    if count > cfg.limit:
        retry_after = max(0, int(cfg.window_seconds - (now - window_start)))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in ~{retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )
