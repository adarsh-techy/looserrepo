import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import vaultReducer from './slices/vaultSlice';
import businessReducer from './slices/businessSlice';
import futurePlansReducer from './slices/futurePlansSlice';
import sharedNotesReducer from './slices/sharedNotesSlice';
import secretNotesReducer from './slices/secretNotesSlice';
import auditLogReducer from './slices/auditLogSlice';
import notificationReducer from './slices/notificationSlice';
import dayToDayReducer from './slices/dayToDaySlice';
import chatReducer from './slices/chatSlice';
import worksReducer from './slices/worksSlice';
import paymentsReducer from './slices/paymentsSlice';
import moneyReducer from './slices/moneySlice';
import personalVaultReducer from './slices/personalVaultSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    vault: vaultReducer,
    personalVault: personalVaultReducer,
    business: businessReducer,
    futurePlans: futurePlansReducer,
    sharedNotes: sharedNotesReducer,
    secretNotes: secretNotesReducer,
    auditLogs: auditLogReducer,
    notifications: notificationReducer,
    dayToDay: dayToDayReducer,
    chat: chatReducer,
    works: worksReducer,
    payments: paymentsReducer,
    money: moneyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
