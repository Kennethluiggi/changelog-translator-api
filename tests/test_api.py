from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_requires_auth():
    r = client.get('/health')
    assert r.status_code == 401
