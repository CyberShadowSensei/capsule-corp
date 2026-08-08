import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessage, IntakeJob } from '../../types';

interface AiIntakeState {
  jobId: string | null;
  title: string | null;
  status: IntakeJob['status'] | null;
  progressPercent: number;
  extractedPayload: IntakeJob['extracted_payload'];
  errorMessage: string | null;
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  isExtractingDocument: boolean;
}

const initialState: AiIntakeState = {
  jobId: null,
  title: null,
  status: null,
  progressPercent: 0,
  extractedPayload: null,
  errorMessage: null,
  chatMessages: [{ role: 'assistant', content: 'Hello! I am your AIVOA QA Copilot. I am here to help you log this complaint. You can upload a document, or tell me what happened in your own words.' }],
  isChatLoading: false,
  isExtractingDocument: false,
};

const aiIntakeSlice = createSlice({
  name: 'aiIntake',
  initialState,
  reducers: {
    setJobId(state, action: PayloadAction<string>) {
      state.jobId = action.payload;
      state.status = 'pending';
      state.progressPercent = 0;
      state.extractedPayload = null;
      state.errorMessage = null;
    },
    updateJobState(state, action: PayloadAction<Partial<IntakeJob>>) {
      const { status, progress_percent, extracted_payload, error_message, title } = action.payload;
      if (title !== undefined) state.title = title;
      if (status !== undefined) state.status = status;
      if (progress_percent !== undefined) state.progressPercent = progress_percent;
      if (extracted_payload !== undefined) state.extractedPayload = extracted_payload;
      if (error_message !== undefined) state.errorMessage = error_message;
      if (status === 'complete' || status === 'error') {
        state.isExtractingDocument = false;
      }
    },
    addChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatMessages.push(action.payload);
    },
    setChatMessages(state, action: PayloadAction<ChatMessage[]>) {
      state.chatMessages = action.payload;
    },
    setChatLoading(state, action: PayloadAction<boolean>) {
      state.isChatLoading = action.payload;
    },
    setExtractingDocument(state, action: PayloadAction<boolean>) {
      state.isExtractingDocument = action.payload;
    },
    resetIntake() {
      return initialState;
    },
  },
});

export const {
  setJobId,
  updateJobState,
  addChatMessage,
  setChatMessages,
  setChatLoading,
  setExtractingDocument,
  resetIntake,
} = aiIntakeSlice.actions;

export default aiIntakeSlice.reducer;
