import pytest
from unittest.mock import patch, MagicMock
from services.intake_service import chat

def test_chat_intent_log():
    db = MagicMock()
    job_mock = MagicMock()
    job_mock.extracted_payload = {"mapped_complaint": {}}
    
    with patch("services.intake_service.intake_repository.get_by_job_id", return_value=job_mock), \
         patch("services.intake_service.chat_repository.add_message"), \
         patch("services.intake_service.chat_completion") as mock_chat:
        
        mock_chat.side_effect = [
            '{"intent": "log"}',
            '{"customer_name": "New User"}',
            '{"severity": "high", "priority": "high", "rationale": "severe issue", "ai_proposed_action": "recall"}'
        ]
        
        res = chat(db, "job-123", "Message about new complaint")
        assert res["intent"] == "log"
        assert res["fields"]["customer_name"] == "New User"
        assert res["fields"]["severity"] == "high"

def test_chat_intent_qa():
    db = MagicMock()
    job_mock = MagicMock()
    job_mock.extracted_payload = {"mapped_complaint": {}}
    
    with patch("services.intake_service.intake_repository.get_by_job_id", return_value=job_mock), \
         patch("services.intake_service.chat_repository.add_message"), \
         patch("services.intake_service.chat_completion") as mock_chat:
        
        mock_chat.side_effect = [
            '{"intent": "qa"}',
            'This is the answer from the document.'
        ]
        
        res = chat(db, "job-123", "What is the severity?")
        assert res["intent"] == "qa"
        assert res["fields"] is None
        assert res["response"] == "This is the answer from the document."

