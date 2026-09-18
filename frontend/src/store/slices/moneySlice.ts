import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { MoneyRecord, MoneyMonthSummary } from '../../types';
import { api } from '../../services/api';

interface MoneyState {
  records: MoneyRecord[];
  monthlySummaries: MoneyMonthSummary[];
  selectedMonth: string | null; // e.g. "2026-09"
  isLoading: boolean;
  error: string | null;
}

const initialState: MoneyState = {
  records: [],
  monthlySummaries: [],
  selectedMonth: null,
  isLoading: false,
  error: null,
};

export const fetchMoneyRecords = createAsyncThunk(
  'money/fetchMoneyRecords',
  async (params?: { monthYear?: string; startDate?: string; endDate?: string }) => {
    let url = '/money';
    const queryParts: string[] = [];
    if (params?.monthYear) queryParts.push(`monthYear=${encodeURIComponent(params.monthYear)}`);
    if (params?.startDate) queryParts.push(`startDate=${encodeURIComponent(params.startDate)}`);
    if (params?.endDate) queryParts.push(`endDate=${encodeURIComponent(params.endDate)}`);

    if (queryParts.length > 0) {
      url += `?${queryParts.join('&')}`;
    }
    return await api.get<MoneyRecord[]>(url);
  }
);

export const fetchMoneyMonthsSummary = createAsyncThunk(
  'money/fetchMoneyMonthsSummary',
  async () => {
    return await api.get<MoneyMonthSummary[]>('/money/summary/months');
  }
);

export const createMoneyAction = createAsyncThunk(
  'money/createMoney',
  async (data: Partial<MoneyRecord>) => {
    return await api.post<MoneyRecord>('/money', data);
  }
);

export const updateMoneyAction = createAsyncThunk(
  'money/updateMoney',
  async ({ id, data }: { id: string; data: Partial<MoneyRecord> }) => {
    return await api.put<MoneyRecord>(`/money/${id}`, data);
  }
);

export const deleteMoneyAction = createAsyncThunk(
  'money/deleteMoney',
  async (id: string) => {
    await api.delete(`/money/${id}`);
    return id;
  }
);

const moneySlice = createSlice({
  name: 'money',
  initialState,
  reducers: {
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action.payload;
    },
    clearSelectedMonth: (state) => {
      state.selectedMonth = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMoneyRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMoneyRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.records = action.payload;
      })
      .addCase(fetchMoneyRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch money records';
      })
      .addCase(fetchMoneyMonthsSummary.fulfilled, (state, action) => {
        state.monthlySummaries = action.payload;
      })
      .addCase(createMoneyAction.fulfilled, (state, action) => {
        state.records.unshift(action.payload);
      })
      .addCase(updateMoneyAction.fulfilled, (state, action) => {
        const index = state.records.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = action.payload;
        }
      })
      .addCase(deleteMoneyAction.fulfilled, (state, action) => {
        state.records = state.records.filter((r) => r.id !== action.payload);
      });
  },
});

export const { setSelectedMonth, clearSelectedMonth } = moneySlice.actions;
export default moneySlice.reducer;
