import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, type RootState, type AppDispatch } from './store';
import ComplaintForm from './features/complaintForm/ComplaintForm';
import AiIntakePanel from './features/aiIntake/AiIntakePanel';
import { setJobId, resetIntake, setChatMessages } from './features/aiIntake/aiIntakeSlice';
import { applyAiFields } from './features/complaintForm/complaintFormSlice';
import './App.css';

const MainApp: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const jobId = useSelector((state: RootState) => state.aiIntake.jobId);
  const [sessions, setSessions] = useState<{job_id: string, created_at: string, title?: string}[]>([]);

  useEffect(() => {
    const savedJobId = localStorage.getItem('currentJobId');
    if (savedJobId) {
      dispatch(setJobId(savedJobId));
    }
    
    // Fetch sessions
    fetch('/api/v1/intake/')
      .then(res => res.json())
      .then(data => {
        if (data && data.jobs) {
          setSessions(data.jobs);
        } else if (Array.isArray(data)) {
          setSessions(data);
        }
      })
      .catch(console.error);
  }, [dispatch]);

  useEffect(() => {
    if (jobId) {
      localStorage.setItem('currentJobId', jobId);
      fetch(`/api/v1/intake/${jobId}`)
        .then(res => res.json())
        .then(data => {
          if (data.chat_messages) {
            dispatch(setChatMessages(data.chat_messages));
            if (data.chat_messages.length > 2 && !data.title) {
              fetch(`/api/v1/intake/${jobId}/generate-title`, { method: 'POST' }).catch(console.error);
            }
          }
          if (data.extracted_payload?.mapped_complaint) {
            dispatch(applyAiFields(data.extracted_payload.mapped_complaint));
          }
        })
        .catch(console.error);
    } else {
      localStorage.removeItem('currentJobId');
    }
  }, [jobId, dispatch]);

  const handleNewComplaint = () => {
    localStorage.removeItem('currentJobId');
    dispatch(resetIntake());
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedJobId = e.target.value;
    if (selectedJobId) {
      dispatch(setJobId(selectedJobId));
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header" role="banner">
        <div className="app-header-inner">
          <span className="app-logo">AIVOA.AI</span>
          <span className="app-header-subtitle">Pharmaceutical Complaint Management</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select onChange={handleSessionChange} value={jobId || ''} className="session-select" style={{ padding: '4px', borderRadius: '4px', fontFamily: 'var(--font-family)', fontSize: '14px' }}>
              <option value="" disabled>Session History</option>
              {sessions.map(s => (
                <option key={s.job_id} value={s.job_id}>{s.title || s.job_id}</option>
              ))}
            </select>
            <button onClick={handleNewComplaint} className="btn-new-complaint" style={{ padding: '4px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', fontFamily: 'var(--font-family)', fontSize: '14px', fontWeight: 'bold' }}>New Complaint</button>
          </div>
        </div>
      </header>
      <main className="app-main" role="main">
        <div className="panel panel-form">
          <ComplaintForm />
        </div>
        <div className="panel panel-ai">
          <AiIntakePanel />
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <MainApp />
    </Provider>
  );
};

export default App;
