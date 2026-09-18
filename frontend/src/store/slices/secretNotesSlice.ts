import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SecretNote } from '../../types';
import { api } from '../../services/api';

interface SecretNotesState {
  notes: SecretNote[];
  unlockedNoteContent: Record<string, { title: string; content: string; category: string; isOwner: boolean }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: SecretNotesState = {
  notes: [],
  unlockedNoteContent: {},
  isLoading: false,
  error: null,
};

export const fetchSecretNotes = createAsyncThunk('secretNotes/fetchNotes', async () => {
  return await api.get<SecretNote[]>('/secret-notes');
});

export const createSecretNoteAction = createAsyncThunk('secretNotes/createNote', async (data: any) => {
  return await api.post('/secret-notes', data);
});

export const unlockSecretNoteAction = createAsyncThunk('secretNotes/unlockNote', async (payload: any, { rejectWithValue }) => {
  try {
    return await api.post<{ id: string; title: string; category: string; content: string; isOwner: boolean }>('/secret-notes/unlock', payload);
  } catch (err: any) {
    return rejectWithValue({ message: err.message, status: err.status, data: err.data });
  }
});

export const denyEmergencyRequestAction = createAsyncThunk('secretNotes/denyRequest', async ({ noteId, reviewNotes }: { noteId: string; reviewNotes?: string }) => {
  await api.post(`/secret-notes/${noteId}/deny`, { reviewNotes });
  return noteId;
});

export const verifyPostDeathAction = createAsyncThunk('secretNotes/verifyPostDeath', async ({ noteId, verificationNotes }: { noteId: string; verificationNotes?: string }) => {
  return await api.post(`/secret-notes/${noteId}/post-death-verify`, { verificationNotes });
});

export const deleteSecretNoteAction = createAsyncThunk('secretNotes/deleteNote', async (id: string) => {
  await api.delete(`/secret-notes/${id}`);
  return id;
});

const secretNotesSlice = createSlice({
  name: 'secretNotes',
  initialState,
  reducers: {
    unlockNoteSuccess: (state, action) => {
      state.unlockedNoteContent[action.payload.noteId] = {
        title: action.payload.title || '',
        content: action.payload.content,
        category: action.payload.category || 'PRIVATE_EMERGENCY',
        isOwner: action.payload.isOwner ?? true,
      };
    },
    lockNote: (state, action) => {
      delete state.unlockedNoteContent[action.payload];
    },
    lockAllNotes: (state) => {
      state.unlockedNoteContent = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSecretNotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSecretNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload;
      })
      .addCase(fetchSecretNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch secret notes';
      })
      .addCase(unlockSecretNoteAction.fulfilled, (state, action) => {
        state.unlockedNoteContent[action.payload.id] = {
          title: action.payload.title,
          content: action.payload.content,
          category: action.payload.category,
          isOwner: action.payload.isOwner,
        };
      })
      .addCase(deleteSecretNoteAction.fulfilled, (state, action) => {
        state.notes = state.notes.filter(n => n.id !== action.payload);
        delete state.unlockedNoteContent[action.payload];
      });
  },
});

export const { lockNote, lockAllNotes } = secretNotesSlice.actions;
export default secretNotesSlice.reducer;
