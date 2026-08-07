import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ComplaintCreate } from '../../types';

// Per-field AI-filled flags track which fields were populated by the AI assistant.
// Cleared automatically when the user edits the field.
type AiFilledFlags = Partial<Record<keyof ComplaintCreate, boolean>>;

interface ComplaintFormState {
  fields: Partial<ComplaintCreate>;
  aiFilled: AiFilledFlags;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  savedId: number | null;
}

const initialState: ComplaintFormState = {
  fields: {},
  aiFilled: {},
  isDirty: false,
  isSaving: false,
  saveError: null,
  savedId: null,
};

const complaintFormSlice = createSlice({
  name: 'complaintForm',
  initialState,
  reducers: {
    // User manually edits a field — clears the AI-filled marker for that field
    setField(state, action: PayloadAction<{ key: keyof ComplaintCreate; value: string | null }>) {
      const { key, value } = action.payload;
      (state.fields as Record<string, string | null>)[key as string] = value;
      (state.aiFilled as Record<string, boolean>)[key as string] = false;
      state.isDirty = true;
    },
    // AI assistant populates one or more fields — marks them as AI-filled
    applyAiFields(state, action: PayloadAction<Partial<ComplaintCreate>>) {
      const incoming = action.payload;
      for (const [key, value] of Object.entries(incoming)) {
        if (value !== null && value !== undefined) {
          (state.fields as Record<string, unknown>)[key] = value;
          (state.aiFilled as Record<string, boolean>)[key] = true;
        }
      }
      state.isDirty = true;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.isSaving = action.payload;
    },
    setSaveError(state, action: PayloadAction<string | null>) {
      state.saveError = action.payload;
    },
    setSavedId(state, action: PayloadAction<number | null>) {
      state.savedId = action.payload;
      state.isDirty = false;
    },
    resetForm() {
      return initialState;
    },
  },
});

export const {
  setField,
  applyAiFields,
  setSaving,
  setSaveError,
  setSavedId,
  resetForm,
} = complaintFormSlice.actions;

export default complaintFormSlice.reducer;
