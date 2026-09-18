import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, ChatPartner } from '../../types';
import { api } from '../../services/api';

interface ChatState {
  messages: ChatMessage[];
  partner: ChatPartner | null;
  unreadCount: number;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  partner: null,
  unreadCount: 0,
  isLoading: false,
  isSending: false,
  error: null,
};

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (partnerId?: string) => {
    const url = partnerId ? `/chat/messages?partnerId=${partnerId}` : '/chat/messages';
    return await api.get<{ messages: ChatMessage[]; partner: ChatPartner }>(url);
  }
);

export const fetchChatPartner = createAsyncThunk(
  'chat/fetchChatPartner',
  async () => {
    return await api.get<{ partner: ChatPartner }>('/chat/partner');
  }
);

export const fetchUnreadChatCount = createAsyncThunk(
  'chat/fetchUnreadChatCount',
  async () => {
    return await api.get<{ unreadCount: number }>('/chat/unread-count');
  }
);

export const sendChatMessage = createAsyncThunk(
  'chat/sendChatMessage',
  async (payload: { content: string; recipientId?: string }) => {
    return await api.post<{ message: ChatMessage }>('/chat/messages', payload);
  }
);

export const markChatAsRead = createAsyncThunk(
  'chat/markChatAsRead',
  async (payload?: { senderId?: string; messageIds?: string[] }) => {
    return await api.patch<{ success: boolean; updatedCount: number; readAt: string }>(
      '/chat/read',
      payload || {}
    );
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addIncomingMessage: (state, action: PayloadAction<ChatMessage>) => {
      const exists = state.messages.some((m) => m.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    updateReadReceipts: (
      state,
      action: PayloadAction<{ readBy: string; readAt: string; messageIds?: string[] }>
    ) => {
      state.messages.forEach((msg) => {
        if (
          (!action.payload.messageIds || action.payload.messageIds.includes(msg.id)) &&
          msg.senderId !== action.payload.readBy
        ) {
          msg.isRead = true;
          msg.readAt = action.payload.readAt;
        }
      });
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
    setPartnerOnlineStatus: (state, action: PayloadAction<boolean>) => {
      if (state.partner) {
        state.partner.isOnline = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = action.payload.messages;
        state.partner = action.payload.partner;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load messages';
      })
      // Fetch partner
      .addCase(fetchChatPartner.fulfilled, (state, action) => {
        state.partner = action.payload.partner;
      })
      // Fetch unread count
      .addCase(fetchUnreadChatCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
      })
      // Send message
      .addCase(sendChatMessage.pending, (state) => {
        state.isSending = true;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.isSending = false;
        const exists = state.messages.some((m) => m.id === action.payload.message.id);
        if (!exists) {
          state.messages.push(action.payload.message);
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.error.message || 'Failed to send message';
      })
      // Mark as read
      .addCase(markChatAsRead.fulfilled, (state) => {
        state.unreadCount = 0;
      });
  },
});

export const {
  addIncomingMessage,
  updateReadReceipts,
  incrementUnreadCount,
  resetUnreadCount,
  setPartnerOnlineStatus,
} = chatSlice.actions;

export default chatSlice.reducer;
