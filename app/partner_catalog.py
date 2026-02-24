import json
from functools import lru_cache
from pathlib import Path
from typing import List


@lru_cache(maxsize=1)
def _load_catalog() -> list[dict]:
    catalog_path = Path(__file__).resolve().parent / "data" / "partners_by_scope.json"
    with catalog_path.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("partners", [])


def impacted_partners_for_scopes(scopes: List[str]) -> List[str]:
    if not scopes:
        return []

    scope_set = {s.strip().lower() for s in scopes if s.strip()}
    impacted: list[str] = []

    for partner in _load_catalog():
        partner_scopes = {s.strip().lower() for s in partner.get("scopes", []) if s.strip()}
        if scope_set.intersection(partner_scopes):
            impacted.append(partner.get("name", "Unknown Partner"))

    return impacted
