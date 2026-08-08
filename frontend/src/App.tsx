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
  const { jobId, title: reduxTitle } = useSelector((state: RootState) => state.aiIntake);
  const [sessions, setSessions] = useState<{job_id: string, created_at: string, title?: string}[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('appTheme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync title updates to the session dropdown list
  useEffect(() => {
    if (jobId && reduxTitle) {
      setSessions(prev => prev.map(s => s.job_id === jobId ? { ...s, title: reduxTitle } : s));
    }
  }, [jobId, reduxTitle]);

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
          if (data.chat_messages && data.chat_messages.length > 0) {
            dispatch(setChatMessages(data.chat_messages));
            if (data.title) {
              dispatch({ type: 'aiIntake/updateJobState', payload: { title: data.title } });
            } else if (data.chat_messages.length > 2) {
              fetch(`/api/v1/intake/${jobId}/generate-title`, { method: 'POST' })
                .then(r => r.json())
                .then(tData => {
                  if (tData.title) {
                    dispatch({ type: 'aiIntake/updateJobState', payload: { title: tData.title } });
                    setSessions(prev => prev.map(s => s.job_id === jobId ? { ...s, title: tData.title } : s));
                  }
                })
                .catch(console.error);
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
    setIsConfirmingDelete(false);
    dispatch(resetIntake());
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedJobId = e.target.value;
    setIsConfirmingDelete(false);
    if (selectedJobId) {
      dispatch(setJobId(selectedJobId));
    }
  };

  const handleDeleteSession = async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/v1/intake/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.job_id !== jobId));
        handleNewComplaint();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header" role="banner">
        <div className="app-header-inner">
          <span className="app-logo">AIVOA.AI</span>
          <span className="app-header-subtitle">Pharmaceutical Complaint Management</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              style={{
                padding: '4px 10px',
                cursor: 'pointer',
                borderRadius: '0',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-family)',
                fontSize: '13px',
                fontWeight: 'bold',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease'
              }}
              title="Toggle Theme"
            >
              {theme === 'light' ? '[ DARK ]' : '[ LIGHT ]'}
            </button>
            <select onChange={handleSessionChange} value={jobId || ''} className="session-select" style={{ padding: '4px 8px', borderRadius: '0', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-family)', fontSize: '13px' }}>
              <option value="" disabled>Session History</option>
              {sessions.map(s => (
                <option key={s.job_id} value={s.job_id}>{s.title || s.job_id}</option>
              ))}
            </select>
            {jobId && (
              isConfirmingDelete ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={handleDeleteSession} style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: '0', border: '1px solid #ff4d4f', color: '#fff', background: '#ff4d4f', fontFamily: 'var(--font-family)', fontSize: '13px', fontWeight: 'bold' }}>
                    Confirm
                  </button>
                  <button onClick={() => setIsConfirmingDelete(false)} style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: '0', border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family)', fontSize: '13px', fontWeight: 'bold' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsConfirmingDelete(true)} style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: '0', border: '1px solid #ff4d4f', color: '#ff4d4f', background: 'var(--color-bg)', fontFamily: 'var(--font-family)', fontSize: '13px', fontWeight: 'bold' }} title="Delete Session">
                  Delete
                </button>
              )
            )}
            <button onClick={handleNewComplaint} style={{ padding: '4px 12px', cursor: 'pointer', borderRadius: '0', border: '1px solid var(--color-primary)', background: 'var(--color-primary)', color: 'var(--color-bg)', fontFamily: 'var(--font-family)', fontSize: '13px', fontWeight: 'bold' }}>New Complaint</button>
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
