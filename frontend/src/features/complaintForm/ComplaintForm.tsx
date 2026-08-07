import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setField, setSaving, setSaveError, setSavedId, resetForm } from './complaintFormSlice';
import TextField from '../../components/ui/TextField/TextField';
import TextareaField from '../../components/ui/TextareaField/TextareaField';
import SelectField from '../../components/ui/SelectField/SelectField';
import './ComplaintForm.css';

const SEVERITY_OPTIONS = [
  { label: 'Critical', value: 'Critical' },
  { label: 'Major', value: 'Major' },
  { label: 'Minor', value: 'Minor' },
];

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

const ComplaintForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { fields, aiFilled, isDirty, isSaving, saveError, savedId } = useSelector(
    (state: RootState) => state.complaintForm
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const f = (key: keyof typeof fields) => fields[key] as string ?? '';
  const ai = (key: keyof typeof aiFilled) => aiFilled[key] ?? false;
  const set = (key: keyof typeof fields) => (value: string) =>
    dispatch(setField({ key: key as any, value: value || null }));

  const handleSave = async () => {
    dispatch(setSaving(true));
    dispatch(setSaveError(null));
    try {
      const response = await fetch('/api/v1/complaints/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Save failed');
      }
      const data = await response.json();
      dispatch(setSavedId(data.id));
    } catch (err: unknown) {
      dispatch(setSaveError(err instanceof Error ? err.message : 'Save failed'));
    } finally {
      dispatch(setSaving(false));
    }
  };

  const handleReset = () => {
    if (isDirty && !confirmReset) {
      setConfirmReset(true);
      return;
    }
    dispatch(resetForm());
    setConfirmReset(false);
  };

  return (
    <div className="complaint-form">
      <div className="form-header">
        <h1 className="form-title">Log Customer Complaint</h1>
        {savedId && (
          <span className="save-success" role="status">
            Saved as Complaint #{savedId}
          </span>
        )}
      </div>

      <section className="form-section" aria-labelledby="section-customer">
        <h2 id="section-customer" className="section-heading">Customer Information</h2>
        <div className="field-row">
          <TextField id="customer_name" label="Customer Name" value={f('customer_name')} onChange={set('customer_name')} aiFilled={ai('customer_name')} />
          <TextField id="customer_email" label="Email" type="email" value={f('customer_email')} onChange={set('customer_email')} aiFilled={ai('customer_email')} />
        </div>
        <div className="field-row">
          <TextField id="company_name" label="Company / Organization" value={f('company_name')} onChange={set('company_name')} aiFilled={ai('company_name')} />
          <TextField id="phone" label="Phone" type="tel" value={f('phone')} onChange={set('phone')} aiFilled={ai('phone')} />
        </div>
      </section>

      <section className="form-section" aria-labelledby="section-product">
        <h2 id="section-product" className="section-heading">Product Details</h2>
        <div className="field-row">
          <TextField id="product_name" label="Product Name" value={f('product_name')} onChange={set('product_name')} aiFilled={ai('product_name')} />
          <TextField id="batch_number" label="Batch Number" value={f('batch_number')} onChange={set('batch_number')} aiFilled={ai('batch_number')} />
        </div>
        <div className="field-row">
          <TextField id="manufacturing_date" label="Manufacturing Date" value={f('manufacturing_date')} onChange={set('manufacturing_date')} aiFilled={ai('manufacturing_date')} />
          <TextField id="expiry_date" label="Expiry Date" value={f('expiry_date')} onChange={set('expiry_date')} aiFilled={ai('expiry_date')} />
        </div>
      </section>

      <section className="form-section" aria-labelledby="section-complaint">
        <h2 id="section-complaint" className="section-heading">Complaint Details</h2>
        <div className="field-row">
          <TextField id="complaint_type" label="Complaint Type" value={f('complaint_type')} onChange={set('complaint_type')} aiFilled={ai('complaint_type')} />
          <TextField id="date_of_complaint" label="Date of Complaint" value={f('date_of_complaint')} onChange={set('date_of_complaint')} aiFilled={ai('date_of_complaint')} />
        </div>
        <TextareaField id="complaint_description" label="Complaint Description" value={f('complaint_description')} onChange={set('complaint_description')} aiFilled={ai('complaint_description')} rows={5} required />
      </section>

      <section className="form-section" aria-labelledby="section-risk">
        <h2 id="section-risk" className="section-heading">Risk Assessment</h2>
        <div className="field-row">
          <SelectField id="severity" label="Severity" value={f('severity')} onChange={set('severity')} options={SEVERITY_OPTIONS} aiFilled={ai('severity')} />
          <SelectField id="priority" label="Priority" value={f('priority')} onChange={set('priority')} options={PRIORITY_OPTIONS} aiFilled={ai('priority')} />
        </div>
        <TextareaField id="ai_proposed_action" label="AI Proposed Action" value={f('ai_proposed_action')} onChange={set('ai_proposed_action')} aiFilled={ai('ai_proposed_action')} rows={3} />
      </section>

      {saveError && (
        <div className="save-error" role="alert">
          {saveError}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          id="btn-reset-form"
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={isSaving}
        >
          {confirmReset ? 'Confirm Reset?' : 'Reset Form'}
        </button>
        <button
          type="button"
          id="btn-save-complaint"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Complaint'}
        </button>
      </div>
    </div>
  );
};

export default ComplaintForm;
