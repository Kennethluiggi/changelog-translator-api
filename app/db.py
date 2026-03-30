import os
import psycopg2
import json
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor


load_dotenv()

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        cursor_factory=RealDictCursor
    )

def insert_translation_run(data: dict):
    conn = get_db_connection()
    cur = conn.cursor()

    query = """
    INSERT INTO translation_runs (
        status,
        mode,
        plan,
        raw_text,
        product_area,
        tone,
        impact_level,
        risk_flags,
        detected_scopes,
        ai_provider,
        ai_fallback_used,
        ai_model,
        ai_prompt_version,
        ai_error_message,
        response_json,
        error_message
    )
    VALUES (
        %(status)s,
        %(mode)s,
        %(plan)s,
        %(raw_text)s,
        %(product_area)s,
        %(tone)s,
        %(impact_level)s,
        %(risk_flags)s,
        %(detected_scopes)s,
        %(ai_provider)s,
        %(ai_fallback_used)s,
        %(ai_model)s,
        %(ai_prompt_version)s,
        %(ai_error_message)s,
        %(response_json)s,
        %(error_message)s
    );
    """

    cur.execute(query, {
        "status": data.get("status"),
        "mode": data.get("mode"),
        "plan": data.get("plan"),
        "raw_text": data.get("raw_text"),
        "product_area": data.get("product_area"),
        "tone": data.get("tone"),
        "impact_level": data.get("impact_level"),
        "risk_flags": json.dumps(data.get("risk_flags")),
        "detected_scopes": json.dumps(data.get("detected_scopes")),
        "ai_provider": data.get("ai_provider"),
        "ai_fallback_used": data.get("ai_fallback_used"),
        "ai_model": data.get("ai_model"),
        "ai_prompt_version": data.get("ai_prompt_version"),
        "ai_error_message": data.get("ai_error_message"),
        "response_json": json.dumps(data.get("response_json")),
        "error_message": data.get("error_message"),
    })

    conn.commit()
    cur.close()
    conn.close()



def fetch_translation_history(limit: int = 10):
    conn = get_db_connection()
    cur = conn.cursor()

    query = """
    SELECT
        id,
        created_at,
        status,
        mode,
        plan,
        raw_text,
        product_area,
        tone,
        impact_level,
        risk_flags,
        detected_scopes,
        ai_provider,
        ai_fallback_used,
        response_json,
        error_message
    FROM translation_runs
    ORDER BY id DESC
    LIMIT %s;
    """

    cur.execute(query, (limit,))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return rows


def fetch_metrics_summary():
    conn = get_db_connection()
    cur = conn.cursor()

    query = """
    SELECT
        COUNT(*) AS total_runs,

        COUNT(*) FILTER (WHERE mode = 'basic') AS basic_runs,
        COUNT(*) FILTER (WHERE mode = 'ai') AS ai_runs,

        COUNT(*) FILTER (WHERE ai_fallback_used = TRUE) AS ai_fallbacks,

        COUNT(*) FILTER (WHERE impact_level = 'high') AS high_impact,
        COUNT(*) FILTER (WHERE impact_level = 'medium') AS medium_impact,
        COUNT(*) FILTER (WHERE impact_level = 'low') AS low_impact

    FROM translation_runs;
    """

    cur.execute(query)
    result = cur.fetchone()

    cur.close()
    conn.close()

    return result