import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DayToDayNote } from '../../types';
import { api } from '../../services/api';

interface DayToDayState {
  notes: DayToDayNote[];
  selectedDate: string; // YYYY-MM-DD
  isLoading: boolean;
  error: string | null;
}

// Default today's date formatted as YYYY-MM-DD
const getTodayFormatted = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialState: DayToDayState = {
  notes: [],
  selectedDate: getTodayFormatted(),
  isLoading: false,
  error: null,
};

export const fetchDayToDayNotes = createAsyncThunk(
  'dayToDay/fetchNotes',
  async (params?: { date?: string; month?: string; search?: string }) => {
    let query = '';
    if (params) {
      const q = new URLSearchParams();
      if (params.date) q.append('date', params.date);
      if (params.month) q.append('month', params.month);
      if (params.search) q.append('search', params.search);
      const str = q.toString();
      if (str) query = `?${str}`;
    }
    return await api.get<DayToDayNote[]>(`/day-to-day${query}`);
  }
);

export const createDayToDayNoteAction = createAsyncThunk(
  'dayToDay/createNote',
  async (data: {
    date: string;
    title: string;
    content?: string;
    category?: string;
    priority?: string;
    time?: string;
    tags?: string[];
  }) => {
    return await api.post<DayToDayNote>('/day-to-day', data);
  }
);

export const updateDayToDayNoteAction = createAsyncThunk(
  'dayToDay/updateNote',
  async ({ id, data }: { id: string; data: any }) => {
    return await api.put<DayToDayNote>(`/day-to-day/${id}`, data);
  }
);

export const toggleCompleteDayToDayNoteAction = createAsyncThunk(
  'dayToDay/toggleComplete',
  async (id: string) => {
    return await api.patch<DayToDayNote>(`/day-to-day/${id}/toggle`);
  }
);

export const deleteDayToDayNoteAction = createAsyncThunk(
  'dayToDay/deleteNote',
  async (id: string) => {
    await api.delete(`/day-to-day/${id}`);
    return id;
  }
);

const dayToDaySlice = createSlice({
  name: 'dayToDay',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDayToDayNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDayToDayNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload;
      })
      .addCase(fetchDayToDayNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notes';
      })
      .addCase(createDayToDayNoteAction.fulfilled, (state, action) => {
        state.notes.unshift(action.payload);
      })
      .addCase(updateDayToDayNoteAction.fulfilled, (state, action) => {
        const index = state.notes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
      })
      .addCase(toggleCompleteDayToDayNoteAction.fulfilled, (state, action) => {
        const index = state.notes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
      })
      .addCase(deleteDayToDayNoteAction.fulfilled, (state, action) => {
        state.notes = state.notes.filter((n) => n.id !== action.payload);
      });
  },
});

export const { setSelectedDate } = dayToDaySlice.actions;
export default dayToDaySlice.reducer;
