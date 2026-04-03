from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db import get_db_connection
import secrets

router = APIRouter(prefix="/apps", tags=["apps"])


class CreateAppRequest(BaseModel):
    workspace_id: int
    name: str
    description: Optional[str] = None
    redirect_uri: Optional[str] = None


class UpdateAppRequest(BaseModel):
    name: str
    description: Optional[str] = None
    redirect_uri: Optional[str] = None


def generate_client_id():
    return "cli_" + secrets.token_hex(8)


def generate_client_secret():
    return secrets.token_hex(24)


@router.post("/create")
def create_app(req: CreateAppRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        client_id = generate_client_id()
        client_secret = generate_client_secret()

        cur.execute("""
            INSERT INTO apps (workspace_id, name, description, status, client_id, client_secret, redirect_uri)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            req.workspace_id,
            req.name,
            req.description,
            "sandbox",
            client_id,
            client_secret,
            req.redirect_uri
        ))

        app_id = cur.fetchone()["id"]
        conn.commit()

        return {
            "success": True,
            "app": {
                "id": app_id,
                "name": req.name,
                "description": req.description,
                "status": "sandbox",
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": req.redirect_uri
            }
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.get("/list/{workspace_id}")
def list_apps(workspace_id: int):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, name, description, status, client_id, client_secret, redirect_uri
            FROM apps
            WHERE workspace_id = %s
            ORDER BY created_at DESC;
        """, (workspace_id,))

        apps = cur.fetchall()

        return {
            "success": True,
            "apps": apps
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.put("/update/{app_id}")
def update_app(app_id: int, req: UpdateAppRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE apps
            SET name = %s,
                description = %s,
                redirect_uri = %s
            WHERE id = %s
            RETURNING id, name, description, status, client_id, client_secret, redirect_uri;
        """, (
            req.name,
            req.description,
            req.redirect_uri,
            app_id
        ))

        result = cur.fetchone()

        if not result:
            conn.rollback()
            raise HTTPException(status_code=404, detail="App not found")

        conn.commit()

        return {
            "success": True,
            "app": result
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.delete("/delete/{app_id}")
def delete_app(app_id: int):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            DELETE FROM apps
            WHERE id = %s
            RETURNING id;
        """, (app_id,))

        result = cur.fetchone()

        if not result:
            conn.rollback()
            raise HTTPException(status_code=404, detail="App not found")

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