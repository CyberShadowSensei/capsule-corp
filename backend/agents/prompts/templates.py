EXTRACT_FIELDS_PROMPT = """\
You are a pharmaceutical QA complaint extraction assistant. Extract all available information from the following complaint document and return it as a valid JSON object matching the schema below.

Schema:
{{
  "customer_name": "string or null",
  "customer_email": "string or null",
  "company_name": "string or null",
  "phone": "string or null",
  "product_name": "string or null",
  "batch_number": "string or null",
  "manufacturing_date": "string or null",
  "expiry_date": "string or null",
  "complaint_description": "string or null",
  "complaint_type": "string or null",
  "date_of_complaint": "string or null",
  "severity": "Critical | Major | Minor | null",
  "priority": "High | Medium | Low | null",
  "ai_proposed_action": "string or null"
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
You are a pharmaceutical QA complaint extraction assistant. Extract complaint information from the user message.

Existing complaint fields (preserve any not mentioned in the message):
{existing_fields}

User message:
{message}

Return a JSON object with all 14 fields (use existing values for fields not mentioned, null for unknown):
{{"customer_name": "string or null","customer_email": "string or null","company_name": "string or null","phone": "string or null","product_name": "string or null","batch_number": "string or null","manufacturing_date": "string or null","expiry_date": "string or null","complaint_description": "string or null","complaint_type": "string or null","date_of_complaint": "string or null","severity": "Critical | Major | Minor | null","priority": "High | Medium | Low | null","ai_proposed_action": "string or null"}}

Return ONLY valid JSON, no markdown fences.
"""
