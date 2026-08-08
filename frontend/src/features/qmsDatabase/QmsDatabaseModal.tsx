import React, { useEffect, useState } from 'react';
import './QmsDatabaseModal.css';

interface ComplaintRecord {
  id: number;
  customer_name?: string | null;
  company_name?: string | null;
  product_name?: string | null;
  batch_number?: string | null;
  complaint_type?: string | null;
  date_of_complaint?: string | null;
  severity?: string | null;
  priority?: string | null;
  ai_proposed_action?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface QmsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QmsDatabaseModal: React.FC<QmsDatabaseModalProps> = ({ isOpen, onClose }) => {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/complaints/');
      if (!res.ok) {
        throw new Error('Failed to load QMS database records');
      }
      const data = await res.json();
      setComplaints(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComplaints();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="qms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="qms-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="qms-modal-header">
          <div>
            <h2 className="qms-modal-title">AIVOA.AI QMS Database</h2>
            <p className="qms-modal-subtitle">Committed Quality Assurance Complaint Records</p>
          </div>
          <button type="button" className="qms-modal-close" onClick={onClose} aria-label="Close modal">[ X ]</button>
        </div>

        <div className="qms-modal-body">
          {loading && <div className="qms-loading">Loading QMS Records...</div>}
          {error && <div className="qms-error">{error}</div>}
          {!loading && !error && complaints.length === 0 && (
            <div className="qms-empty">No complaints have been committed to the QMS Database yet.</div>
          )}

          {!loading && !error && complaints.length > 0 && (
            <div className="qms-table-wrapper">
              <table className="qms-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Customer / Organization</th>
                    <th>Product & Batch</th>
                    <th>Type & Date</th>
                    <th>Severity</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold">#QMS-{c.id}</td>
                      <td>
                        <div className="record-customer">{c.customer_name || 'N/A'}</div>
                        <div className="record-company">{c.company_name || 'N/A'}</div>
                      </td>
                      <td>
                        <div className="record-product">{c.product_name || 'N/A'}</div>
                        <div className="record-batch">Batch: {c.batch_number || 'N/A'}</div>
                      </td>
                      <td>
                        <div className="record-type">{c.complaint_type || 'General Defect'}</div>
                        <div className="record-date">{c.date_of_complaint || 'N/A'}</div>
                      </td>
                      <td>
                        <span className={`badge badge-severity ${c.severity?.toLowerCase()}`}>
                          {c.severity || 'Minor'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-priority ${c.priority?.toLowerCase()}`}>
                          {c.priority || 'Low'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-status">COMMITTED</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="qms-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={fetchComplaints}>Refresh Database</button>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default QmsDatabaseModal;
