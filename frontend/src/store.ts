import { configureStore } from '@reduxjs/toolkit';
import complaintFormReducer from '../features/complaintForm/complaintFormSlice';
import aiIntakeReducer from '../features/aiIntake/aiIntakeSlice';

export const store = configureStore({
  reducer: {
    complaintForm: complaintFormReducer,
    aiIntake: aiIntakeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
