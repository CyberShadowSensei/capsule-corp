import React from 'react';
import type { Complaint } from '../../types';
import './ComplaintsList.css';

interface ComplaintsTableProps {
  complaints: Complaint[];
  onRowClick: (id: number) => void;
}

const ComplaintsTable: React.FC<ComplaintsTableProps> = ({ complaints, onRowClick }) => {
  if (!complaints || complaints.length === 0) {
    return <div className="p-4 text-center">No complaints found.</div>;
  }

  return (
    <div className="table-container">
      <table className="complaints-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Product</th>
            <th>Batch</th>
            <th>Severity</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((complaint: any) => (
            <tr 
              key={complaint.id} 
              onClick={() => onRowClick(complaint.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(complaint.id);
                }
              }}
              className="complaints-row"
            >
              <td>{complaint.customer_name || 'N/A'}</td>
              <td>{complaint.product_name || 'N/A'}</td>
              <td>{complaint.batch_number || 'N/A'}</td>
              <td>{complaint.severity || 'N/A'}</td>
              <td>{complaint.priority || 'N/A'}</td>
              <td>{complaint.status || 'N/A'}</td>
              <td>{complaint.date_of_complaint || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComplaintsTable;
