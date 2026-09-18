import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { NotificationItem } from '../../types';
import { api } from '../../services/api';

interface NotificationState {
  notifications: NotificationItem[];
  isLoading: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  isLoading: false,
};

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  return await api.get<NotificationItem[]>('/notifications');
});

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id: string) => {
  return await api.patch<NotificationItem>(`/notifications/${id}/read`);
});

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async () => {
  await api.post('/notifications/read-all');
  return true;
});

export const clearAllNotifications = createAsyncThunk('notifications/clearAll', async () => {
  await api.delete('/notifications/clear');
  return true;
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addLiveNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.notifications.find(n => n.id === action.payload.id);
        if (item) item.isRead = true;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications.forEach(n => (n.isRead = true));
      })
      .addCase(clearAllNotifications.fulfilled, (state) => {
        state.notifications = [];
      });
  },
});

export const { addLiveNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
