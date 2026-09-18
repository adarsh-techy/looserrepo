import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AuditLog } from '../../types';
import { api } from '../../services/api';

interface AuditLogState {
  logs: AuditLog[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
}

const initialState: AuditLogState = {
  logs: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  page: 1,
  error: null,
};

export const fetchAuditLogs = createAsyncThunk(
  'auditLogs/fetchLogs',
  async (params?: { severity?: string; eventType?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.severity) query.append('severity', params.severity);
    if (params?.eventType) query.append('eventType', params.eventType);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    query.append('limit', (params?.limit || 20).toString());
    return await api.get<AuditLog[]>(`/audit-logs?${query.toString()}`);
  }
);

export const fetchMoreAuditLogs = createAsyncThunk(
  'auditLogs/fetchMoreLogs',
  async (params: { severity?: string; eventType?: string; search?: string; page: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.severity) query.append('severity', params.severity);
    if (params?.eventType) query.append('eventType', params.eventType);
    if (params?.search) query.append('search', params.search);
    query.append('page', params.page.toString());
    query.append('limit', (params?.limit || 20).toString());
    return await api.get<AuditLog[]>(`/audit-logs?${query.toString()}`);
  }
);

const auditLogSlice = createSlice({
  name: 'auditLogs',
  initialState,
  reducers: {
    resetAuditLogs(state) {
      state.logs = [];
      state.page = 1;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload;
        state.page = 1;
        const limit = action.meta.arg?.limit || 20;
        state.hasMore = action.payload.length >= limit;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch audit logs';
      })
      .addCase(fetchMoreAuditLogs.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(fetchMoreAuditLogs.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        // Avoid duplicate entries if any
        const existingIds = new Set(state.logs.map((l) => l.id));
        const newLogs = action.payload.filter((l) => !existingIds.has(l.id));
        state.logs = [...state.logs, ...newLogs];
        state.page = action.meta.arg.page;
        const limit = action.meta.arg.limit || 20;
        state.hasMore = action.payload.length >= limit;
      })
      .addCase(fetchMoreAuditLogs.rejected, (state) => {
        state.isLoadingMore = false;
      });
  },
});

export const { resetAuditLogs } = auditLogSlice.actions;
export default auditLogSlice.reducer;

