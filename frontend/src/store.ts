import { configureStore } from '@reduxjs/toolkit';
import complaintFormReducer from './features/complaintForm/complaintFormSlice';
import aiIntakeReducer from './features/aiIntake/aiIntakeSlice';
import complaintsListReducer from './features/complaintsList/complaintsListSlice';

export const store = configureStore({
  reducer: {
    complaintForm: complaintFormReducer,
    aiIntake: aiIntakeReducer,
    complaintsList: complaintsListReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
