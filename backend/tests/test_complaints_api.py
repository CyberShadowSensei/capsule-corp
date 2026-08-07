import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models.complaint
import models.intake_job
import models.chat_message
from main import app
from database import Base, get_db
from unittest.mock import patch
from unittest.mock import patch

from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_complaint_crud_happy_path():
    post_data = {
        "customer_name": "Test User",
        "complaint_description": "Issue with test",
        "severity": "high",
        "status": "draft"
    }
    response = client.post("/api/v1/complaints/", json=post_data)
    assert response.status_code == 201
    created_id = response.json()["id"]
    
    response = client.get(f"/api/v1/complaints/{created_id}")
    assert response.status_code == 200
    assert response.json()["customer_name"] == "Test User"
    
    patch_data = {"status": "under_investigation"}
    response = client.patch(f"/api/v1/complaints/{created_id}", json=patch_data)
    assert response.status_code == 200
    assert response.json()["status"] == "under_investigation"

def test_complaint_validation_failure():
    response = client.post("/api/v1/complaints/", data="invalid_json_string")
    assert response.status_code == 422

def test_chat_stateless_api():
    post_data = {
        "message": "Hello"
    }
    with patch("services.intake_service.chat_completion") as mock_chat:
        mock_chat.side_effect = ['{"intent": "qa"}', "Hi there"]
        
        response = client.post("/api/v1/intake/chat", json=post_data)
        
        assert response.status_code == 200
        json_resp = response.json()
        assert "job_id" in json_resp
        assert json_resp["job_id"] is not None
        assert json_resp["intent"] == "qa"
        assert json_resp["response"] == "Hi there"

