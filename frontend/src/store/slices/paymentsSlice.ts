import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { PaymentRecord, PaymentMonthSummary } from '../../types';
import { api } from '../../services/api';

interface PaymentsState {
  records: PaymentRecord[];
  monthlySummaries: PaymentMonthSummary[];
  selectedMonth: string | null; // e.g. "2026-09"
  isLoading: boolean;
  isSummaryLoading: boolean;
  error: string | null;
}

const initialState: PaymentsState = {
  records: [],
  monthlySummaries: [],
  selectedMonth: null,
  isLoading: false,
  isSummaryLoading: false,
  error: null,
};

export const fetchPayments = createAsyncThunk(
  'payments/fetchPayments',
  async (monthYear?: string) => {
    const url = monthYear ? `/payments?monthYear=${encodeURIComponent(monthYear)}` : '/payments';
    return await api.get<PaymentRecord[]>(url);
  }
);

export const fetchPaymentMonthsSummary = createAsyncThunk(
  'payments/fetchPaymentMonthsSummary',
  async () => {
    return await api.get<PaymentMonthSummary[]>('/payments/summary/months');
  }
);

export const createPaymentAction = createAsyncThunk(
  'payments/createPayment',
  async (data: Partial<PaymentRecord>) => {
    return await api.post<PaymentRecord>('/payments', data);
  }
);

export const updatePaymentAction = createAsyncThunk(
  'payments/updatePayment',
  async ({ id, data }: { id: string; data: Partial<PaymentRecord> }) => {
    return await api.put<PaymentRecord>(`/payments/${id}`, data);
  }
);

export const deletePaymentAction = createAsyncThunk(
  'payments/deletePayment',
  async (id: string) => {
    await api.delete(`/payments/${id}`);
    return id;
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
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
      .addCase(fetchPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.records = action.payload;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch payment records';
      })
      .addCase(fetchPaymentMonthsSummary.pending, (state) => {
        state.isSummaryLoading = true;
      })
      .addCase(fetchPaymentMonthsSummary.fulfilled, (state, action) => {
        state.isSummaryLoading = false;
        state.monthlySummaries = action.payload;
      })
      .addCase(fetchPaymentMonthsSummary.rejected, (state) => {
        state.isSummaryLoading = false;
      })
      .addCase(createPaymentAction.fulfilled, (state, action) => {
        state.records.unshift(action.payload);
      })
      .addCase(updatePaymentAction.fulfilled, (state, action) => {
        const index = state.records.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = action.payload;
        }
      })
      .addCase(deletePaymentAction.fulfilled, (state, action) => {
        state.records = state.records.filter((r) => r.id !== action.payload);
      });
  },
});

export const { setSelectedMonth, clearSelectedMonth } = paymentsSlice.actions;
export default paymentsSlice.reducer;
