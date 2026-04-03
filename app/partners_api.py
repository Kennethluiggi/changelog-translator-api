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


def _clean_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


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
        parts = [part.strip() for part in value.split(",")]
        cleaned = []
        seen = set()
        for part in parts:
            if part and part.lower() not in seen:
                seen.add(part.lower())
                cleaned.append(part)
        return cleaned

    return []


def _normalize_row_keys(row: dict[str, Any]) -> dict[str, Any]:
    return {str(k).strip(): v for k, v in row.items()}


def _lower_key_map(row: dict[str, Any]) -> dict[str, Any]:
    return {str(k).strip().lower(): v for k, v in row.items()}


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
            key_str = str(key).strip()
            if key_str and key_str not in seen:
                seen.add(key_str)
                ordered.append(key_str)

    return ordered


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
        "impact_status": "none",   # placeholder for future product-owned overlay
        "impact_reason": "",       # placeholder for future product-owned overlay
    }


def _normalize_partner_row(row: dict[str, Any]) -> dict[str, Any]:
    raw_row = _normalize_row_keys(row)

    return {
        "partner_name": _best_effort_partner_name(raw_row),
        "scopes": _best_effort_scopes(raw_row),
        "area": _best_effort_area(raw_row),
        "status": _best_effort_status(raw_row),
        "extra": raw_row,
    }


def _replace_workspace_partner_dataset(
    workspace_id: int,
    normalized_rows: list[dict[str, Any]],
    source_type: str,
) -> dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()

    try:
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
            INSERT INTO partner_uploads (workspace_id, source_type, row_count, is_active)
            VALUES (%s, %s, %s, TRUE)
            RETURNING id;
            """,
            (workspace_id, source_type, len(normalized_rows)),
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

        columns = _dynamic_columns_from_rows([row["extra"] for row in normalized_rows])
        dynamic_rows = [_build_dynamic_row(row, columns) for row in inserted_rows]

        return {
            "success": True,
            "upload_id": upload_id,
            "row_count": len(dynamic_rows),
            "columns": columns,
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
        csv_stream = io.StringIO(req.csv_text)
        reader = csv.DictReader(csv_stream)

        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV must include a header row")

        raw_rows = list(reader)
        normalized_rows = [_normalize_partner_row(row) for row in raw_rows]

        return _replace_workspace_partner_dataset(
            workspace_id=req.workspace_id,
            normalized_rows=normalized_rows,
            source_type="csv",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-json")
def upload_json(req: UploadJsonRequest):
    try:
        normalized_rows = [_normalize_partner_row(row) for row in req.rows]

        return _replace_workspace_partner_dataset(
            workspace_id=req.workspace_id,
            normalized_rows=normalized_rows,
            source_type="json",
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
                json.dumps(merged_extra),
                row_id,
            ),
        )

        result = cur.fetchone()
        conn.commit()

        workspace_id = result["workspace_id"]
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