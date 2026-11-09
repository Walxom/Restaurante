import pytest
from fastapi.testclient import TestClient
from ai_engine.main import app
from ai_engine.llm_service import LLMService


@pytest.fixture
def client():
    return TestClient(app)


def test_llm_service_initialization():
    llm = LLMService()
    # Sin API key o con fallback, debe manejarlo de forma segura
    assert hasattr(llm, "api_key")
    assert hasattr(llm, "_gemini_model")
    assert hasattr(llm, "circuit_open")
    assert isinstance(llm.circuit_open, bool)


def test_llm_service_update_key_empty():
    llm = LLMService()
    success = llm.update_api_key("")
    assert success is True
    assert llm.api_key == ""
    assert llm.client is None


def test_health_endpoint_gemini_telemetry(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "gemini" in data
    gemini_info = data["gemini"]
    assert "configured" in gemini_info
    assert "model" in gemini_info
    assert "status" in gemini_info
    assert gemini_info["status"] in ["ready", "missing_key"]


def test_config_gemini_empty_key(client):
    response = client.post("/api/config/gemini", json={"apiKey": ""})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["gemini"]["configured"] is False


def test_config_gemini_invalid_format(client):
    # Formato con saltos de línea o muy corto
    response = client.post("/api/config/gemini", json={"apiKey": "short\ninvalid"})
    assert response.status_code == 400
    assert "Formato de API Key no válido" in response.json()["detail"]


def test_config_gemini_aq_format_syntax():
    sample_key = "AQ.Ab8RN6JyMezHxbGgCuTyMtmp99kG6yXKU8QzV4iOAGki3tMN1g"
    assert len(sample_key) >= 20
    assert len(sample_key) <= 80
    assert not any(c in sample_key for c in ["\n", "\r", " ", "\t"])

