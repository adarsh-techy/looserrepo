import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { VaultItem } from '../../types';
import { api } from '../../services/api';

interface VaultState {
  items: VaultItem[];
  revealedPasswords: Record<string, { password: string; expiryTime: number }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: VaultState = {
  items: [],
  revealedPasswords: {},
  isLoading: false,
  error: null,
};

export const fetchVaultItems = createAsyncThunk('vault/fetchItems', async (search?: string) => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return await api.get<VaultItem[]>(`/vault${query}`);
});

export const createVaultItemAction = createAsyncThunk('vault/createItem', async (data: any) => {
  return await api.post<VaultItem>('/vault', data);
});

export const revealVaultPasswordAction = createAsyncThunk('vault/revealPassword', async (id: string, { rejectWithValue }) => {
  try {
    return await api.post<{ id: string; password: string; autoHideSeconds: number }>(`/vault/${id}/reveal`);
  } catch (err: any) {
    return rejectWithValue({ message: err.message, status: err.status, data: err.data });
  }
});

export const updateVaultItemAction = createAsyncThunk('vault/updateItem', async ({ id, data }: { id: string; data: any }) => {
  return await api.put<VaultItem>(`/vault/${id}`, data);
});

export const deleteVaultItemAction = createAsyncThunk(
  'vault/deleteItem',
  async ({ id, password }: { id: string; password: string }, { rejectWithValue }) => {
    try {
      await api.delete(`/vault/${id}`, { password });
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete vault item');
    }
  }
);

const vaultSlice = createSlice({
  name: 'vault',
  initialState,
  reducers: {
    maskPassword: (state, action) => {
      delete state.revealedPasswords[action.payload];
    },
    maskAllPasswords: (state) => {
      state.revealedPasswords = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVaultItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchVaultItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchVaultItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch vault items';
      })
      .addCase(createVaultItemAction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(revealVaultPasswordAction.fulfilled, (state, action) => {
        state.revealedPasswords[action.payload.id] = {
          password: action.payload.password,
          expiryTime: Date.now() + (action.payload.autoHideSeconds || 30) * 1000,
        };
      })
      .addCase(updateVaultItemAction.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteVaultItemAction.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
        delete state.revealedPasswords[action.payload];
      });
  },
});

export const { maskPassword, maskAllPasswords } = vaultSlice.actions;
export default vaultSlice.reducer;
