import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../../types';

interface ComplaintsListState {
  complaints: Complaint[];
  isLoading: boolean;
  error: string | null;
  filters: {
    status: string;
    severity: string;
  };
}

const initialState: ComplaintsListState = {
  complaints: [],
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    severity: 'all',
  },
};

export const fetchComplaints = createAsyncThunk(
  'complaintsList/fetchComplaints',
  async () => {
    const response = await fetch('/api/v1/complaints');
    if (!response.ok) {
      throw new Error('Failed to fetch complaints');
    }
    const data = await response.json();
    return data as Complaint[];
  }
);

const complaintsListSlice = createSlice({
  name: 'complaintsList',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<string>) {
      state.filters.status = action.payload;
    },
    setSeverityFilter(state, action: PayloadAction<string>) {
      state.filters.severity = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.complaints = action.payload;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'An error occurred';
      });
  },
});

export const { setStatusFilter, setSeverityFilter } = complaintsListSlice.actions;
export default complaintsListSlice.reducer;
