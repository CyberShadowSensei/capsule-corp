import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import ComplaintForm from './features/complaintForm/ComplaintForm';
import AiIntakePanel from './features/aiIntake/AiIntakePanel';
import './App.css';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <div className="app-shell">
        <header className="app-header" role="banner">
          <div className="app-header-inner">
            <span className="app-logo">AIVOA.AI</span>
            <span className="app-header-subtitle">Pharmaceutical Complaint Management</span>
          </div>
        </header>
        <main className="app-main" role="main">
          <div className="panel panel-ai">
            <AiIntakePanel />
          </div>
          <div className="panel panel-form">
            <ComplaintForm />
          </div>
        </main>
        <footer className="app-footer" role="contentinfo">
          <span>System Status: Operational</span>
        </footer>
      </div>
    </Provider>
  );
};

export default App;
