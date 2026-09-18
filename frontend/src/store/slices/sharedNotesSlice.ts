import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SharedNote } from '../../types';
import { api } from '../../services/api';

interface SharedNotesState {
  notes: SharedNote[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SharedNotesState = {
  notes: [],
  isLoading: false,
  error: null,
};

export const fetchSharedNotes = createAsyncThunk('sharedNotes/fetchNotes', async () => {
  return await api.get<SharedNote[]>('/shared-notes');
});

export const createSharedNoteAction = createAsyncThunk('sharedNotes/createNote', async (data: any) => {
  return await api.post<SharedNote>('/shared-notes', data);
});

export const markSharedNoteReadAction = createAsyncThunk('sharedNotes/markRead', async (id: string) => {
  return await api.patch<SharedNote>(`/shared-notes/${id}/read`);
});

export const deleteSharedNoteAction = createAsyncThunk('sharedNotes/deleteNote', async (id: string) => {
  await api.delete(`/shared-notes/${id}`);
  return id;
});

const sharedNotesSlice = createSlice({
  name: 'sharedNotes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSharedNotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSharedNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload;
      })
      .addCase(createSharedNoteAction.fulfilled, (state, action) => {
        state.notes.unshift(action.payload);
      })
      .addCase(markSharedNoteReadAction.fulfilled, (state, action) => {
        const index = state.notes.findIndex(n => n.id === action.payload.id);
        if (index !== -1) state.notes[index] = action.payload;
      })
      .addCase(deleteSharedNoteAction.fulfilled, (state, action) => {
        state.notes = state.notes.filter(n => n.id !== action.payload);
      });
  },
});

export default sharedNotesSlice.reducer;
