// Shared TypeScript types — mirrors backend Pydantic schemas field-for-field.
// Update this file in the same commit as any backend schema change.

export interface Complaint {
  id: number;
  created_at: string | null;
  updated_at: string | null;

  // Customer Info
  customer_name: string | null;
  customer_email: string | null;
  company_name: string | null;
  phone: string | null;

  // Product Details
  product_name: string | null;
  batch_number: string | null;
  manufacturing_date: string | null;
  expiry_date: string | null;

  // Complaint Details
  complaint_description: string | null;
  complaint_type: string | null;
  date_of_complaint: string | null;

  // Risk Assessment
  severity: 'Critical' | 'Major' | 'Minor' | null;
  priority: 'High' | 'Medium' | 'Low' | null;
  ai_proposed_action: string | null;

  status: string;
  job_id: string | null;
}

export type ComplaintCreate = Omit<Complaint, 'id' | 'created_at' | 'updated_at'>;
export type ComplaintUpdate = Partial<ComplaintCreate>;

export interface IntakeJob {
  job_id: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress_percent: number;
  extracted_payload: ExtractedPayload | null;
  error_message: string | null;
}

export interface ExtractedPayload {
  mapped_complaint: Partial<ComplaintCreate> | null;
  severity: string | null;
  priority: string | null;
  rationale: string | null;
  ai_proposed_action: string | null;
  summary: string | null;
  root_causes: { probable_root_causes: string[]; investigation_areas: string[] } | null;
  capa: { corrective_actions: string[]; preventive_actions: string[] } | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: 'log' | 'edit' | 'qa' | 'error';
}
