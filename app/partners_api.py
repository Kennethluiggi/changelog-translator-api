import csv
import io
import json
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import get_db_connection

router = APIRouter(prefix="/partners", tags=["partners"])


class UploadCsvRequest(BaseModel):
    workspace_id: int
    csv_text: str = Field(..., min_length=1)


class UploadJsonRequest(BaseModel):
    workspace_id: int
    rows: list[dict[str, Any]]


class UpdatePartnerRequest(BaseModel):
    partner_name: Optional[str] = None
    scopes: list[str] = Field(default_factory=list)
    area: Optional[str] = None
    status: Optional[str] = None
    extra: dict[str, Any] = Field(default_factory=dict)

class CreatePartnerRequest(BaseModel):
    workspace_id: int
    row_data: dict[str, Any]


@router.post("/create")
def create_partner(req: CreatePartnerRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        _ensure_partner_uploads_columns_order_column(cur)

        workspace_id = req.workspace_id
        row_data = req.row_data or {}

        active_columns = _get_active_columns_for_workspace(cur, workspace_id)
        if not active_columns:
            raise HTTPException(status_code=400, detail="No active dataset found")

        cur.execute(
            """
            SELECT id
            FROM partner_uploads
            WHERE workspace_id = %s AND is_active = TRUE
            ORDER BY id DESC
            LIMIT 1;
            """,
            (workspace_id,),
        )
        upload = cur.fetchone()

        if not upload:
            raise HTTPException(status_code=400, detail="No active dataset found")

        upload_id = upload["id"]

        exact_extra = _build_extra_from_active_columns(row_data, active_columns)
        normalized = _normalize_partner_row(exact_extra)

        cur.execute(
            """
            INSERT INTO partner_mappings (
                workspace_id,
                upload_id,
                partner_name,
                scopes,
                area,
                status,
                extra
            )
            VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s::jsonb)
            RETURNING id, workspace_id, upload_id, partner_name, scopes, area, status, extra, created_at;
            """,
            (
                workspace_id,
                upload_id,
                normalized["partner_name"],
                json.dumps(normalized["scopes"]),
                normalized["area"],
                normalized["status"],
                json.dumps(exact_extra),
            ),
        )

        result = cur.fetchone()
        conn.commit()

        return {
            "success": True,
            "row": _build_dynamic_row(result, active_columns),
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()

        
def _strip_wrapping_quotes(value: str) -> str:
    cleaned = value.strip().lstrip("\ufeff")

    while len(cleaned) >= 2 and cleaned.startswith('"') and cleaned.endswith('"'):
        cleaned = cleaned[1:-1].strip()

    return cleaned


def _clean_string(value: Any) -> str:
    if value is None:
        return ""

    cleaned = str(value).replace('""', '"')
    cleaned = _strip_wrapping_quotes(cleaned)
    return cleaned.strip()


def _clean_key(value: Any) -> str:
    return _clean_string(value).lower()


def _normalize_scopes(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, list):
        cleaned: list[str] = []
        seen = set()
        for item in value:
            scope = _clean_string(item)
            if scope and scope.lower() not in seen:
                seen.add(scope.lower())
                cleaned.append(scope)
        return cleaned

    if isinstance(value, str):
        parts = [part.strip() for part in _clean_string(value).split(",")]
        cleaned = []
        seen = set()
        for part in parts:
            normalized = _clean_string(part)
            if normalized and normalized.lower() not in seen:
                seen.add(normalized.lower())
                cleaned.append(normalized)
        return cleaned

    return []


def _normalize_row_keys(row: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in row.items():
        cleaned_key = _clean_string(key)
        if cleaned_key:
            normalized[cleaned_key] = value
    return normalized


def _lower_key_map(row: dict[str, Any]) -> dict[str, Any]:
    lowered: dict[str, Any] = {}
    for key, value in row.items():
        cleaned_key = _clean_key(key)
        if cleaned_key:
            lowered[cleaned_key] = value
    return lowered


def _pick_first(row: dict[str, Any], keys: list[str]) -> Any:
    lowered = _lower_key_map(row)
    for key in keys:
        if key in lowered:
            return lowered[key]
    return None


def _best_effort_partner_name(row: dict[str, Any]) -> str:
    candidate = _pick_first(
        row,
        [
            "partner_name",
            "partner",
            "name",
            "customer",
            "customer_name",
            "account",
            "account_name",
            "organization",
            "org",
            "company",
            "client",
        ],
    )
    cleaned = _clean_string(candidate)
    return cleaned or "Unknown"


def _best_effort_scopes(row: dict[str, Any]) -> list[str]:
    candidate = _pick_first(
        row,
        [
            "scopes",
            "scope",
            "permissions",
            "permission_scopes",
            "oauth_scopes",
            "api_scopes",
            "capabilities",
        ],
    )
    return _normalize_scopes(candidate)


def _best_effort_area(row: dict[str, Any]) -> str:
    candidate = _pick_first(
        row,
        [
            "area",
            "product_area",
            "domain",
            "module",
            "service",
            "team",
            "product",
            "feature_area",
        ],
    )
    return _clean_string(candidate)


def _best_effort_status(row: dict[str, Any]) -> str:
    candidate = _pick_first(
        row,
        [
            "status",
            "state",
            "mapping_status",
            "health",
            "condition",
        ],
    )
    cleaned = _clean_string(candidate)
    return cleaned or "mapped"


def _dynamic_columns_from_rows(rows: list[dict[str, Any]]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    for row in rows:
        for key in row.keys():
            key_str = _clean_string(key)
            if key_str and key_str not in seen:
                seen.add(key_str)
                ordered.append(key_str)

    return ordered


def _ensure_partner_uploads_columns_order_column(cur) -> None:
    cur.execute(
        """
        ALTER TABLE partner_uploads
        ADD COLUMN IF NOT EXISTS columns_order JSONB DEFAULT '[]'::jsonb;
        """
    )


def _get_active_columns_for_workspace(cur, workspace_id: int) -> list[str]:
    _ensure_partner_uploads_columns_order_column(cur)

    cur.execute(
        """
        SELECT columns_order
        FROM partner_uploads
        WHERE workspace_id = %s AND is_active = TRUE
        ORDER BY id DESC
        LIMIT 1;
        """,
        (workspace_id,),
    )
    row = cur.fetchone()

    if not row:
        return []

    raw = row.get("columns_order") or []
    if not isinstance(raw, list):
        return []

    ordered: list[str] = []
    seen: set[str] = set()

    for item in raw:
        cleaned = _clean_string(item)
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)

    return ordered

_COLUMN_ALIASES: dict[str, list[str]] = {
    "partner": [
        "partner",
        "partner name",
        "partner_name",
        "name",
        "customer",
        "customer_name",
        "account",
        "account_name",
        "organization",
        "org",
        "company",
        "client",
    ],
    "scopes": [
        "scopes",
        "scope",
        "permissions",
        "permission_scopes",
        "oauth_scopes",
        "api_scopes",
        "capabilities",
    ],
    "area": [
        "area",
        "product_area",
        "domain",
        "module",
        "service",
        "team",
        "product",
        "feature_area",
    ],
    "status": [
        "status",
        "state",
        "mapping_status",
        "health",
        "condition",
    ],
}


def _get_row_value_for_active_column(row_data: dict[str, Any], active_column: str) -> str:
    lowered_input: dict[str, Any] = {}
    for key, value in row_data.items():
        cleaned_key = _clean_key(key)
        if cleaned_key:
            lowered_input[cleaned_key] = value

    target = _clean_key(active_column)

    if target in lowered_input:
        return _clean_string(lowered_input[target])

    aliases = _COLUMN_ALIASES.get(target, [target])
    for alias in aliases:
        cleaned_alias = _clean_key(alias)
        if cleaned_alias in lowered_input:
            return _clean_string(lowered_input[cleaned_alias])

    return ""


def _build_extra_from_active_columns(
    row_data: dict[str, Any],
    active_columns: list[str],
) -> dict[str, Any]:
    return {
        column: _get_row_value_for_active_column(row_data, column)
        for column in active_columns
    }

def _build_dynamic_row(
    db_row: dict[str, Any],
    columns: list[str],
) -> dict[str, Any]:
    raw = db_row.get("extra") or {}

    return {
        "id": db_row["id"],
        "workspace_id": db_row["workspace_id"],
        "upload_id": db_row["upload_id"],
        "partner_name": db_row.get("partner_name") or "",
        "scopes": db_row.get("scopes") or [],
        "area": db_row.get("area") or "",
        "status": db_row.get("status") or "",
        "extra": raw,
        "created_at": db_row["created_at"],
        "row_data": {column: raw.get(column, "") for column in columns},
        "impact_status": "none",
        "impact_reason": "",
    }


def _normalize_partner_row(row: dict[str, Any]) -> dict[str, Any]:
    raw_row = _normalize_row_keys(row)

    cleaned_extra = {
        _clean_string(key): _clean_string(value)
        for key, value in raw_row.items()
        if _clean_string(key)
    }

    return {
        "partner_name": _best_effort_partner_name(raw_row),
        "scopes": _best_effort_scopes(raw_row),
        "area": _best_effort_area(raw_row),
        "status": _best_effort_status(raw_row),
        "extra": cleaned_extra,
    }


def _parse_single_wrapped_csv_row(line: str) -> list[str]:
    cleaned = line.strip()
    cleaned = _strip_wrapping_quotes(cleaned)
    cleaned = cleaned.replace('""', '"')
    parsed = next(csv.reader([cleaned]))
    return [_clean_string(value) for value in parsed]


def _parse_uploaded_csv_rows(csv_text: str) -> tuple[list[str], list[dict[str, Any]]]:
    normalized_text = csv_text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    lines = [line for line in normalized_text.split("\n") if line.strip()]

    if not lines:
        raise HTTPException(status_code=400, detail="CSV must include a header row")

    header_reader = csv.reader([lines[0]])
    raw_header = next(header_reader)

    if len(raw_header) == 1 and "," in raw_header[0]:
        headers = [_clean_string(part) for part in raw_header[0].split(",")]
    else:
        headers = [_clean_string(part) for part in raw_header]

    headers = [header for header in headers if header]

    if not headers:
        raise HTTPException(status_code=400, detail="CSV must include a valid header row")

    parsed_rows: list[dict[str, Any]] = []

    for line in lines[1:]:
        parsed_values = _parse_single_wrapped_csv_row(line)

        if len(parsed_values) < len(headers):
            parsed_values.extend([""] * (len(headers) - len(parsed_values)))
        elif len(parsed_values) > len(headers):
            parsed_values = parsed_values[: len(headers)]

        parsed_rows.append(dict(zip(headers, parsed_values)))

    return headers, parsed_rows


def _replace_workspace_partner_dataset(
    workspace_id: int,
    normalized_rows: list[dict[str, Any]],
    source_type: str,
    source_columns: list[str],
) -> dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        _ensure_partner_uploads_columns_order_column(cur)

        cur.execute(
            """
            UPDATE partner_uploads
            SET is_active = FALSE
            WHERE workspace_id = %s AND is_active = TRUE;
            """,
            (workspace_id,),
        )

        cur.execute(
            """
            DELETE FROM partner_mappings
            WHERE workspace_id = %s;
            """,
            (workspace_id,),
        )

        cur.execute(
            """
            INSERT INTO partner_uploads (workspace_id, source_type, row_count, is_active, columns_order)
            VALUES (%s, %s, %s, TRUE, %s::jsonb)
            RETURNING id;
            """,
            (workspace_id, source_type, len(normalized_rows), json.dumps(source_columns)),
        )
        upload_id = cur.fetchone()["id"]

        inserted_rows: list[dict[str, Any]] = []

        for row in normalized_rows:
            cur.execute(
                """
                INSERT INTO partner_mappings (
                    workspace_id,
                    upload_id,
                    partner_name,
                    scopes,
                    area,
                    status,
                    extra
                )
                VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s::jsonb)
                RETURNING id, workspace_id, upload_id, partner_name, scopes, area, status, extra, created_at;
                """,
                (
                    workspace_id,
                    upload_id,
                    row["partner_name"],
                    json.dumps(row["scopes"]),
                    row["area"],
                    row["status"],
                    json.dumps(row["extra"]),
                ),
            )
            inserted_rows.append(cur.fetchone())

        conn.commit()

        dynamic_rows = [_build_dynamic_row(row, source_columns) for row in inserted_rows]

        return {
            "success": True,
            "upload_id": upload_id,
            "row_count": len(dynamic_rows),
            "columns": source_columns,
            "rows": dynamic_rows,
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.post("/upload-csv")
def upload_csv(req: UploadCsvRequest):
    try:
        source_columns, raw_rows = _parse_uploaded_csv_rows(req.csv_text)
        normalized_rows = [_normalize_partner_row(row) for row in raw_rows]

        return _replace_workspace_partner_dataset(
            workspace_id=req.workspace_id,
            normalized_rows=normalized_rows,
            source_type="csv",
            source_columns=source_columns,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-json")
def upload_json(req: UploadJsonRequest):
    try:
        normalized_rows = [_normalize_partner_row(row) for row in req.rows]
        source_columns = _dynamic_columns_from_rows([row.get("extra") or {} for row in normalized_rows])

        return _replace_workspace_partner_dataset(
            workspace_id=req.workspace_id,
            normalized_rows=normalized_rows,
            source_type="json",
            source_columns=source_columns,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list/{workspace_id}")
def list_partners(workspace_id: int):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id, workspace_id, upload_id, partner_name, scopes, area, status, extra, created_at
            FROM partner_mappings
            WHERE workspace_id = %s
            ORDER BY id ASC;
            """,
            (workspace_id,),
        )

        rows = cur.fetchall()
        columns = _get_active_columns_for_workspace(cur, workspace_id)
        if not columns:
            columns = _dynamic_columns_from_rows([row.get("extra") or {} for row in rows])

        dynamic_rows = [_build_dynamic_row(row, columns) for row in rows]

        return {
            "success": True,
            "columns": columns,
            "rows": dynamic_rows,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.put("/update/{row_id}")
def update_partner(row_id: int, req: UpdatePartnerRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        _ensure_partner_uploads_columns_order_column(cur)

        current_query = """
            SELECT id, workspace_id, upload_id, partner_name, scopes, area, status, extra, created_at
            FROM partner_mappings
            WHERE id = %s
            LIMIT 1;
        """
        cur.execute(current_query, (row_id,))
        current = cur.fetchone()

        if not current:
            raise HTTPException(status_code=404, detail="Partner row not found")

        current_extra = current.get("extra") or {}
        merged_extra = dict(current_extra)
        merged_extra.update(req.extra or {})

        normalized_extra = {
            _clean_string(key): _clean_string(value)
            for key, value in merged_extra.items()
            if _clean_string(key)
        }

        partner_name = (req.partner_name or current.get("partner_name") or "Unknown").strip()
        scopes = req.scopes if req.scopes else (current.get("scopes") or [])
        area = (req.area if req.area is not None else current.get("area") or "").strip()
        status = (req.status if req.status is not None else current.get("status") or "mapped").strip()

        cur.execute(
            """
            UPDATE partner_mappings
            SET partner_name = %s,
                scopes = %s::jsonb,
                area = %s,
                status = %s,
                extra = %s::jsonb
            WHERE id = %s
            RETURNING id, workspace_id, upload_id, partner_name, scopes, area, status, extra, created_at;
            """,
            (
                partner_name,
                json.dumps(scopes),
                area,
                status,
                json.dumps(normalized_extra),
                row_id,
            ),
        )

        result = cur.fetchone()
        conn.commit()

        workspace_id = result["workspace_id"]
        columns = _get_active_columns_for_workspace(cur, workspace_id)
        if not columns:
            cur.execute(
                """
                SELECT extra
                FROM partner_mappings
                WHERE workspace_id = %s
                ORDER BY id ASC;
                """,
                (workspace_id,),
            )
            all_rows = cur.fetchall()
            columns = _dynamic_columns_from_rows([row.get("extra") or {} for row in all_rows])

        return {
            "success": True,
            "columns": columns,
            "row": _build_dynamic_row(result, columns),
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.delete("/delete/{row_id}")
def delete_partner(row_id: int):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            DELETE FROM partner_mappings
            WHERE id = %s
            RETURNING id;
            """,
            (row_id,),
        )

        result = cur.fetchone()

        if not result:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Partner row not found")

        conn.commit()

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.delete("/reset/{workspace_id}")
def reset_partners(workspace_id: int):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        _ensure_partner_uploads_columns_order_column(cur)

        cur.execute(
            """
            DELETE FROM partner_mappings
            WHERE workspace_id = %s;
            """,
            (workspace_id,),
        )

        cur.execute(
            """
            UPDATE partner_uploads
            SET is_active = FALSE
            WHERE workspace_id = %s AND is_active = TRUE;
            """,
            (workspace_id,),
        )

        conn.commit()

        return {"success": True}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()