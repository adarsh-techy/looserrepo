import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { VaultItem } from '../../types';
import { api } from '../../services/api';

interface PersonalVaultState {
  items: VaultItem[];
  revealedPasswords: Record<string, { password: string; expiryTime: number }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: PersonalVaultState = {
  items: [],
  revealedPasswords: {},
  isLoading: false,
  error: null,
};

export const fetchPersonalVaultItems = createAsyncThunk('personalVault/fetchItems', async (search?: string) => {
  const query = search
    ? `?isPersonal=true&search=${encodeURIComponent(search)}`
    : '?isPersonal=true';
  return await api.get<VaultItem[]>(`/vault${query}`);
});

export const createPersonalVaultItemAction = createAsyncThunk('personalVault/createItem', async (data: any) => {
  return await api.post<VaultItem>('/vault', { ...data, isPersonal: true });
});

export const revealPersonalVaultPasswordAction = createAsyncThunk(
  'personalVault/revealPassword',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.post<{ id: string; password: string; autoHideSeconds: number }>(`/vault/${id}/reveal`);
    } catch (err: any) {
      return rejectWithValue({ message: err.message, status: err.status, data: err.data });
    }
  }
);

export const updatePersonalVaultItemAction = createAsyncThunk(
  'personalVault/updateItem',
  async ({ id, data }: { id: string; data: any }) => {
    return await api.put<VaultItem>(`/vault/${id}`, data);
  }
);

export const deletePersonalVaultItemAction = createAsyncThunk(
  'personalVault/deleteItem',
  async ({ id, password }: { id: string; password: string }, { rejectWithValue }) => {
    try {
      await api.delete(`/vault/${id}`, { password });
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete personal vault item');
    }
  }
);

const personalVaultSlice = createSlice({
  name: 'personalVault',
  initialState,
  reducers: {
    maskPersonalPassword: (state, action) => {
      delete state.revealedPasswords[action.payload];
    },
    maskAllPersonalPasswords: (state) => {
      state.revealedPasswords = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonalVaultItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPersonalVaultItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchPersonalVaultItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch personal vault items';
      })
      .addCase(createPersonalVaultItemAction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(revealPersonalVaultPasswordAction.fulfilled, (state, action) => {
        state.revealedPasswords[action.payload.id] = {
          password: action.payload.password,
          expiryTime: Date.now() + (action.payload.autoHideSeconds || 30) * 1000,
        };
      })
      .addCase(updatePersonalVaultItemAction.fulfilled, (state, action) => {
        const index = state.items.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deletePersonalVaultItemAction.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
        delete state.revealedPasswords[action.payload];
      });
  },
});

export const { maskPersonalPassword, maskAllPersonalPasswords } = personalVaultSlice.actions;
export default personalVaultSlice.reducer;
