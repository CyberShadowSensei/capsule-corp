import React, { useEffect, useState } from 'react';
import type { Complaint } from '../../types';
import '../complaintsList/ComplaintsList.css';

interface ComplaintDetailProps {
  id: number;
  onBack: () => void;
}

const ComplaintDetail: React.FC<ComplaintDetailProps> = ({ id, onBack }) => {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/complaints/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch complaint details');
        }
        const data = await response.json();
        setComplaint(data);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <div className="complaint-detail-loading">Loading complaint details...</div>;
  }

  if (error || !complaint) {
    return (
      <div className="complaint-detail-error">
        <div className="error-text">Error: {error}</div>
        <button className="btn-back" onClick={onBack}>Back to List</button>
      </div>
    );
  }

  return (
    <div className="complaint-detail">
      <button className="btn-back" onClick={onBack}>
        &larr; Back to List
      </button>
      
      <h2>Complaint #{complaint.id} Details</h2>
      <div className="detail-grid">
        
        <div className="detail-section">
          <h3>Customer Info</h3>
          <p><strong>Name:</strong> {complaint.customer_name || 'N/A'}</p>
          <p><strong>Email:</strong> {complaint.customer_email || 'N/A'}</p>
          <p><strong>Company:</strong> {complaint.company_name || 'N/A'}</p>
          <p><strong>Phone:</strong> {complaint.phone || 'N/A'}</p>
        </div>

        <div className="detail-section">
          <h3>Product Details</h3>
          <p><strong>Product:</strong> {complaint.product_name || 'N/A'}</p>
          <p><strong>Batch:</strong> {complaint.batch_number || 'N/A'}</p>
          <p><strong>Mfg Date:</strong> {complaint.manufacturing_date || 'N/A'}</p>
          <p><strong>Expiry Date:</strong> {complaint.expiry_date || 'N/A'}</p>
        </div>

        <div className="detail-section detail-section-full">
          <h3>Complaint Information</h3>
          <p><strong>Type:</strong> {complaint.complaint_type || 'N/A'}</p>
          <p><strong>Date of Complaint:</strong> {complaint.date_of_complaint || 'N/A'}</p>
          <p><strong>Description:</strong></p>
          <div className="detail-text-block">
            {complaint.complaint_description || 'N/A'}
          </div>
        </div>

        <div className="detail-section detail-section-full">
          <h3>Risk Assessment & Status</h3>
          <p><strong>Status:</strong> {complaint.status || 'N/A'}</p>
          <p><strong>Severity:</strong> {complaint.severity || 'N/A'}</p>
          <p><strong>Priority:</strong> {complaint.priority || 'N/A'}</p>
          <p><strong>AI Proposed Action:</strong></p>
          <div className="detail-text-block">
            {complaint.ai_proposed_action || 'N/A'}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComplaintDetail;
