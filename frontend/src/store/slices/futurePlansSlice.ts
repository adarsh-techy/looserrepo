import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FuturePlan } from '../../types';
import { api } from '../../services/api';

interface FuturePlansState {
  plans: FuturePlan[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FuturePlansState = {
  plans: [],
  isLoading: false,
  error: null,
};

export const fetchFuturePlans = createAsyncThunk('futurePlans/fetchPlans', async (params?: { search?: string; priority?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.priority) query.append('priority', params.priority);
  if (params?.status) query.append('status', params.status);
  return await api.get<FuturePlan[]>(`/future-plans?${query.toString()}`);
});

export const createFuturePlanAction = createAsyncThunk('futurePlans/createPlan', async (data: any) => {
  return await api.post<FuturePlan>('/future-plans', data);
});

export const updateFuturePlanAction = createAsyncThunk('futurePlans/updatePlan', async ({ id, data }: { id: string; data: any }) => {
  return await api.put<FuturePlan>(`/future-plans/${id}`, data);
});

export const updatePartnerNotesAction = createAsyncThunk(
  'futurePlans/updatePartnerNotes',
  async ({ id, notes, role }: { id: string; notes: string; role?: string }) => {
    return await api.patch<FuturePlan>(`/future-plans/${id}/partner-notes`, { notes, role });
  }
);

export const deleteFuturePlanAction = createAsyncThunk('futurePlans/deletePlan', async (id: string) => {
  await api.delete(`/future-plans/${id}`);
  return id;
});

const futurePlansSlice = createSlice({
  name: 'futurePlans',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFuturePlans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFuturePlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans = action.payload;
      })
      .addCase(fetchFuturePlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch future plans';
      })
      .addCase(createFuturePlanAction.fulfilled, (state, action) => {
        state.plans.unshift(action.payload);
      })
      .addCase(updateFuturePlanAction.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.plans[index] = action.payload;
      })
      .addCase(updatePartnerNotesAction.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.plans[index] = action.payload;
      })
      .addCase(deleteFuturePlanAction.fulfilled, (state, action) => {
        state.plans = state.plans.filter(p => p.id !== action.payload);
      });
  },
});

export default futurePlansSlice.reducer;
