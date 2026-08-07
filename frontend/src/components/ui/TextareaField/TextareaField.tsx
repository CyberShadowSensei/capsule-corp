import React from 'react';
import './TextareaField.css';

interface TextareaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  aiFilled?: boolean;
  rows?: number;
}

const TextareaField: React.FC<TextareaFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  aiFilled = false,
  rows = 4,
}) => {
  return (
    <div className={`field-group${aiFilled ? ' ai-filled' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
        {aiFilled && <span className="ai-badge">AI</span>}
      </label>
      <textarea
        id={id}
        className="field-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        aria-required={required}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
      />
      {error && (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default TextareaField;
