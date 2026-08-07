import pytest
from unittest.mock import patch
from agents.nodes.extract_fields import extract_fields
from agents.state import ComplaintState

def test_extract_fields_success():
    with patch('agents.nodes.extract_fields.chat_completion') as mock_chat:
        mock_chat.return_value = '{"customer_name": "John Doe", "complaint_description": "Broken product"}'
        
        state = ComplaintState(job_id="123", raw_text="John Doe had a broken product", progress_percent=0)
        new_state = extract_fields(state)
        
        assert new_state.get("status") != "error"
        fields = new_state.get("extracted_fields", {})
        assert fields.get("customer_name") == "John Doe"
        assert fields.get("complaint_description") == "Broken product"
        assert new_state.get("progress_percent") == 45
        assert mock_chat.call_count == 1

def test_extract_fields_retry_success():
    with patch('agents.nodes.extract_fields.chat_completion') as mock_chat:
        mock_chat.side_effect = [
            'invalid json',
            '{"customer_name": "Jane Doe", "complaint_description": "Missing parts"}'
        ]
        
        state = ComplaintState(job_id="124", raw_text="Jane Doe missing parts", progress_percent=0)
        new_state = extract_fields(state)
        
        assert new_state.get("status") != "error"
        fields = new_state.get("extracted_fields", {})
        assert fields.get("customer_name") == "Jane Doe"
        assert fields.get("complaint_description") == "Missing parts"
        assert mock_chat.call_count == 2

def test_extract_fields_retry_failure():
    with patch('agents.nodes.extract_fields.chat_completion') as mock_chat:
        mock_chat.side_effect = ['invalid json', 'still invalid']
        
        state = ComplaintState(job_id="125", raw_text="Some text", progress_percent=0)
        new_state = extract_fields(state)
        
        assert new_state.get("status") == "error"
        assert "Field extraction failed" in new_state.get("error_message", "")
        assert mock_chat.call_count == 2
