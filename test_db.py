from app.db import get_db_connection

conn = get_db_connection()
print("Connected!")

conn.close()