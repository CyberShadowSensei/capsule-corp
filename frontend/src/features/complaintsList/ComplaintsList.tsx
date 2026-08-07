import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchComplaints, setStatusFilter, setSeverityFilter } from './complaintsListSlice';
import ComplaintsTable from './ComplaintsTable';
import './ComplaintsList.css';

interface ComplaintsListProps {
  onRowClick: (id: number) => void;
}

const ComplaintsList: React.FC<ComplaintsListProps> = ({ onRowClick }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { complaints, isLoading, error, filters } = useSelector((state: RootState) => state.complaintsList);

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const filteredComplaints = complaints.filter((complaint: any) => {
    const matchStatus = filters.status === 'all' || complaint.status === filters.status;
    const matchSeverity = filters.severity === 'all' || complaint.severity === filters.severity;
    return matchStatus && matchSeverity;
  });

  return (
    <div className="complaints-list-container">
      <h2>Complaints List</h2>
      
      <div className="filters">
        <div>
          <label htmlFor="status-filter">Status: </label>
          <select 
            id="status-filter"
            value={filters.status}
            onChange={(e) => dispatch(setStatusFilter(e.target.value))}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="pending_triage">Pending Triage</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="capa_assigned">CAPA Assigned</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label htmlFor="severity-filter">Severity: </label>
          <select 
            id="severity-filter"
            value={filters.severity}
            onChange={(e) => dispatch(setSeverityFilter(e.target.value))}
          >
            <option value="all">All</option>
            <option value="Critical">Critical</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div>Loading complaints...</div>
      ) : error ? (
        <div className="error-msg">Error: {error}</div>
      ) : (
        <ComplaintsTable complaints={filteredComplaints} onRowClick={onRowClick} />
      )}
    </div>
  );
};

export default ComplaintsList;
