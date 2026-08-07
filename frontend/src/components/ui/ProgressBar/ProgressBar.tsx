import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  percent: number;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percent, label }) => {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="progress-wrapper" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="progress-percent">{clamped}%</span>
    </div>
  );
};

export default ProgressBar;
