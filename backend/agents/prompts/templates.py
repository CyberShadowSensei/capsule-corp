EXTRACT_FIELDS_PROMPT = """\
You are a pharmaceutical QA complaint extraction assistant. Extract all available information from the following complaint document and return it as a valid JSON object matching the schema below.

Schema:
{{
  "customer_name": null, // replace with string if known
  "customer_email": null, // replace with string if known
  "company_name": null, // replace with string if known
  "phone": null, // replace with string if known
  "product_name": null, // replace with string if known
  "batch_number": null, // replace with string if known
  "manufacturing_date": null, // replace with string if known
  "expiry_date": null, // replace with string if known
  "complaint_description": null, // replace with string if known
  "complaint_type": null, // replace with string if known
  "date_of_complaint": null, // replace with string if known
  "severity": null, // Critical | Major | Minor | null
  "priority": null, // High | Medium | Low | null
  "ai_proposed_action": null // replace with string if known
}}

Rules:
- Return ONLY valid JSON, no extra text, no markdown fences.
- Use null for any field not present in the document.
- For severity and priority, infer from context only if clearly implied; otherwise use null.
- For ai_proposed_action, suggest a QA action if severity or complaint context implies one.

Document:
{document_text}
"""

VALIDATE_FIELDS_PROMPT = """\
You are a pharmaceutical QA data quality reviewer. Given the extracted complaint fields below, assess each field for completeness and confidence.

Extracted fields:
{extracted_json}

Return a JSON object:
{{
  "completeness_score": <0.0-1.0>,
  "missing_critical_fields": ["list of field names"],
  "confidence": "high | medium | low",
  "needs_escalation": true | false,
  "notes": "brief assessor note"
}}

Return ONLY valid JSON, no markdown.
"""

RISK_ASSESSMENT_PROMPT = """\
You are a pharmaceutical QA risk assessor. Given the complaint details below, determine the risk level.

Complaint details:
{complaint_json}

Return a JSON object:
{{
  "severity": "Critical | Major | Minor",
  "priority": "High | Medium | Low",
  "rationale": "2-3 sentence justification for the risk classification",
  "ai_proposed_action": "specific QA action to take"
}}

Rules:
- Never return a bare severity/priority label without a rationale.
- Critical severity means patient safety risk or regulatory reportability.
- Return ONLY valid JSON, no markdown.
"""

SUMMARY_PROMPT = """\
You are a pharmaceutical QA assistant. Write a concise 2-3 sentence summary of the following complaint for a QA investigation record.

Complaint fields:
{complaint_json}

Return plain text only, no JSON, no markdown.
"""

ROOT_CAUSE_PROMPT = """\
You are a pharmaceutical root cause analysis expert. Based on the complaint details, suggest the most probable root causes.

Complaint:
{complaint_json}

Return a JSON object:
{{
  "probable_root_causes": ["list of 1-3 root cause strings"],
  "investigation_areas": ["list of areas to investigate"]
}}

Return ONLY valid JSON, no markdown.
"""

CAPA_PROMPT = """\
You are a pharmaceutical CAPA specialist. Based on the complaint details and root causes, recommend CAPA actions.

Complaint and root causes:
{context_json}

Return a JSON object:
{{
  "corrective_actions": ["list of corrective actions"],
  "preventive_actions": ["list of preventive actions"]
}}

Return ONLY valid JSON, no markdown.
"""

INTENT_DETECTION_PROMPT = """\
You are a pharmaceutical QA assistant. Classify the user message below.

Return a JSON object:
{{"intent": "log" | "edit" | "qa", "confidence": <0.0-1.0>}}

- "log": user is describing a new complaint or asking to log one (e.g. 'Apollo Pharmacy reported discolored capsules...')
- "edit": user is correcting or updating an existing complaint field (e.g. 'sorry the batch number is...', 'update the quantity to...')
- "qa": user is asking a question about the complaint context

Current complaint context (may be empty):
{context}

User message:
{message}

Return ONLY valid JSON, no markdown.
"""

CHAT_EXTRACT_PROMPT = """\
You are a pharmaceutical QA complaint extraction assistant. Extract complaint information by analyzing the FULL CONVERSATION HISTORY and the latest user message.

CRITICAL DATA RULES:
- PRESERVE POPULATED FIELDS: If a field is already populated in `existing_fields` (e.g. customer_name: "Rahul"), DO NOT overwrite it with null unless the user explicitly requested a change.
- USER NAME EXTRACTION: If the user states their name anywhere in the conversation (e.g., "my name is X", "I am X"), ALWAYS extract it into customer_name.
- COMPANY / HOSPITAL / CLINIC EXTRACTION: If a hospital, pharmacy, clinic, or medical center is mentioned (e.g., "Apollo Pharmacy", "City General Hospital", "Regional Medical Center"), extract it into company_name if not already set.
- PRODUCT ISOLATION: Extract ONLY the product that is the subject of the complaint (e.g. "AtorShield 20" or "Atorvastatin Calcium Tablets 20mg"). Ignore competitor brands or comparison products mentioned in passing.
- DATE EXTRACTION: If explicit dates or date ranges are mentioned (e.g. "2026-07-18 to 2026-07-21"), extract the primary date (e.g. "2026-07-18") into date_of_complaint. For manufacturing/expiry dates, extract into manufacturing_date/expiry_date.
- NEVER populate structured fields with ambiguous or relative input (e.g. "6 months ago"). Leave relative values as null.

Existing complaint fields:
{existing_fields}

Full Conversation History:
{history}

Latest User Message:
{message}

Return a JSON object with all 14 fields plus a conversational response (use existing values for fields not mentioned, null for unknown):
{{
  "customer_name": null,
  "customer_email": null,
  "company_name": null,
  "phone": null,
  "product_name": null,
  "batch_number": null,
  "manufacturing_date": null,
  "expiry_date": null,
  "complaint_description": null,
  "complaint_type": null,
  "date_of_complaint": null,
  "severity": null,
  "priority": null,
  "ai_proposed_action": null,
  "response": "string"
}}

For the 'response' string: 
- Be natural, warm, and concise. Use clean paragraphs or bullet points to improve readability.
- If customer_name is known (e.g. "Rahul"), address them respectfully by name (e.g., "Dear Rahul,").
- NEVER use robotic meta-language like 'functioning properly', 'no context to work with', 'AI assistant', or 'prompt'.
- ONLY list remaining missing fields that are STILL NULL in the complaint form. NEVER ask for fields that are already populated or provided in the conversation!
- Remind the user that they can upload or attach a complaint document/email/image at any time.

Return ONLY valid JSON, no markdown fences.
"""

TITLE_GENERATION_PROMPT = """\
You are an AI assistant. Read the following complaint conversation and generate a concise 3-5 word title summarizing the core issue.

Conversation:
{conversation}

Return ONLY the title string, no quotes, no extra text.\
"""
