import sys
import os
import uuid
import logging

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from services import intake_service
from repositories import intake_repository

logging.basicConfig(level=logging.INFO)

def test_3_turn_conversation_cycle():
    db = SessionLocal()
    job_id = f"test_cycle_{uuid.uuid4().hex[:8]}"
    print(f"\n--- STARTING CONVERSATION CYCLE TEST (Job ID: {job_id}) ---")
    
    try:
        # Create job
        intake_service.create_job(db, job_id=job_id, source_type="chat")
        
        # TURN 1: User introduces self
        print("\nTurn 1: 'hi I am rahul, how are you?'")
        res1 = intake_service.chat(db, job_id, "hi I am rahul, how are you?")
        print("Copilot Response 1:", res1["response"])
        
        # TURN 2: User pastes complaint text
        complaint_text = """
--- PRODUCT INFORMATION ---
Product Name: Atorvastatin Calcium Tablets 20mg
Brand Name: AtorShield 20
Batch Number: ATV24907B
Manufacturing Date: 2026-01-15
Expiry Date: 2027-01-14

--- COMPLAINT DESCRIPTION ---
Pharmacist at City General Hospital (Dr. Priya Mehta) flagged that tablets from pack lot ATV24907B-P3 were visibly discolored.
Two patients reported nausea and unusual fatigue within 48 hours of switching to this batch.
The complaints span a period from 2026-07-18 to 2026-07-21.
Dissolution testing on 6 retained samples showed dissolution rates below specification (67% and 71% vs 80% Q value).
"""
        print("\nTurn 2: Pasting Atorvastatin complaint text...")
        res2 = intake_service.chat(db, job_id, complaint_text)
        print("Copilot Response 2:", res2["response"])
        
        fields = res2["fields"]
        print("\n--- EXTRACTED FORM FIELDS ---")
        print("Customer Name:", fields.get("customer_name"))
        print("Company Name:", fields.get("company_name"))
        print("Product Name:", fields.get("product_name"))
        print("Batch Number:", fields.get("batch_number"))
        print("Severity:", fields.get("severity"))
        print("Priority:", fields.get("priority"))
        
        # ASSERTIONS
        assert fields.get("customer_name") == "Rahul", f"Expected 'Rahul', got '{fields.get('customer_name')}'"
        assert "/" not in str(fields.get("company_name")), f"Company name contains slashes: {fields.get('company_name')}"
        assert "/" not in str(fields.get("product_name")), f"Product name contains slashes: {fields.get('product_name')}"
        assert fields.get("severity") in ("Critical", "Major", "Minor"), f"Invalid severity: {fields.get('severity')}"
        assert fields.get("priority") in ("High", "Medium", "Low"), f"Invalid priority: {fields.get('priority')}"
        
        print("\n[OK] CONVERSATION CYCLE TEST PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_3_turn_conversation_cycle()
