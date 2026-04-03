import bcrypt
from app.db import get_db_connection

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_user(email: str, password: str, full_name: str, business_name: str | None):
    print("START create_user")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        print("DB connected")

        password_hash = hash_password(password)
        print("Password hashed")

        cur.execute("""
            INSERT INTO users (email, password_hash, full_name)
            VALUES (%s, %s, %s)
            RETURNING id;
        """, (email, password_hash, full_name))

        print("AFTER USER EXECUTE")
        user_row = cur.fetchone()
        print("USER FETCH RESULT:", user_row)

        if user_row is None:
            raise Exception("User insert failed — no ID returned")

        user_id = user_row["id"]
        print("User ID:", user_id)

        workspace_name = business_name if business_name else f"{full_name}'s Workspace"

        cur.execute("""
            INSERT INTO workspaces (owner_user_id, name)
            VALUES (%s, %s)
            RETURNING id;
        """, (user_id, workspace_name))

        print("AFTER WORKSPACE EXECUTE")
        workspace_row = cur.fetchone()
        print("WORKSPACE FETCH RESULT:", workspace_row)

        if workspace_row is None:
            raise Exception("Workspace insert failed — no ID returned")

        workspace_id = workspace_row["id"]
        print("Workspace ID:", workspace_id)

        conn.commit()
        print("COMMIT SUCCESS")

        return {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "workspace_name": workspace_name,
            "email": email,
            "full_name": full_name,
        }

    except Exception as e:
        print("ROLLBACK TRIGGERED:", repr(e))
        conn.rollback()
        raise e

    finally:
        cur.close()
        conn.close()
        print("CONNECTION CLOSED")


def login_user(email: str, password: str):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        print("START login_user")

        cur.execute("""
            SELECT id, email, password_hash, full_name
            FROM users
            WHERE email = %s
            LIMIT 1;
        """, (email,))

        user_row = cur.fetchone()
        print("LOGIN USER ROW:", user_row)

        if user_row is None:
            raise Exception("Invalid email or password")

        stored_hash = user_row["password_hash"]
        if not stored_hash:
            raise Exception("Invalid email or password")

        if not verify_password(password, stored_hash):
            raise Exception("Invalid email or password")

        user_id = user_row["id"]

        cur.execute("""
            SELECT id, name
            FROM workspaces
            WHERE owner_user_id = %s
            ORDER BY id ASC
            LIMIT 1;
        """, (user_id,))

        workspace_row = cur.fetchone()
        print("LOGIN WORKSPACE ROW:", workspace_row)

        if workspace_row is None:
            raise Exception("Workspace not found for user")

        return {
            "user_id": user_row["id"],
            "email": user_row["email"],
            "full_name": user_row["full_name"],
            "workspace_id": workspace_row["id"],
            "workspace_name": workspace_row["name"],
        }

    finally:
        cur.close()
        conn.close()
        print("LOGIN CONNECTION CLOSED")