import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/core/authSlice';
import uiReducer from './slices/core/uiSlice';
import vaultReducer from './slices/passwords/vaultSlice';
import businessReducer from './slices/business/businessSlice';
import futurePlansReducer from './slices/futurePlans/futurePlansSlice';
import sharedNotesReducer from './slices/notifications/sharedNotesSlice';
import secretNotesReducer from './slices/secretNotes/secretNotesSlice';
import auditLogReducer from './slices/admin/auditLogSlice';
import notificationReducer from './slices/notifications/notificationSlice';
import dayToDayReducer from './slices/dayToDay/dayToDaySlice';
import chatReducer from './slices/messages/chatSlice';
import worksReducer from './slices/works/worksSlice';
import paymentsReducer from './slices/payments/paymentsSlice';
import moneyReducer from './slices/money/moneySlice';
import personalVaultReducer from './slices/passwords/personalVaultSlice';

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
