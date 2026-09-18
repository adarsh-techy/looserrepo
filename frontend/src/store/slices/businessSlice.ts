import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BusinessItem } from '../../types';
import { api } from '../../services/api';

interface BusinessState {
  items: BusinessItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: BusinessState = {
  items: [],
  isLoading: false,
  error: null,
};

export const fetchBusinessItems = createAsyncThunk('business/fetchItems', async (params?: { search?: string; category?: string; tag?: string }) => {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.category) query.append('category', params.category);
  if (params?.tag) query.append('tag', params.tag);
  return await api.get<BusinessItem[]>(`/business?${query.toString()}`);
});

export const createBusinessItemAction = createAsyncThunk('business/createItem', async (data: any) => {
  return await api.post<BusinessItem>('/business', data);
});

export const updateBusinessItemAction = createAsyncThunk('business/updateItem', async ({ id, data }: { id: string; data: any }) => {
  return await api.put<BusinessItem>(`/business/${id}`, data);
});

export const deleteBusinessItemAction = createAsyncThunk('business/deleteItem', async (id: string) => {
  await api.delete(`/business/${id}`);
  return id;
});

const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBusinessItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchBusinessItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch business items';
      })
      .addCase(createBusinessItemAction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateBusinessItemAction.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteBusinessItemAction.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
  },
});

export default businessSlice.reducer;
