import React from 'react';
import './TextField.css';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel';
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  aiFilled?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  disabled = false,
  required = false,
  aiFilled = false,
}) => {
  return (
    <div className={`field-group${aiFilled ? ' ai-filled' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
        {aiFilled && <span className="ai-badge">AI</span>}
      </label>
      <input
        id={id}
        type={type}
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
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

export default TextField;
