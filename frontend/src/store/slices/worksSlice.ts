import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { WorkProject } from '../../types';
import { api } from '../../services/api';

interface WorksState {
  works: WorkProject[];
  selectedWork: WorkProject | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: WorksState = {
  works: [],
  selectedWork: null,
  isLoading: false,
  error: null,
};

export const fetchWorks = createAsyncThunk('works/fetchWorks', async () => {
  return await api.get<WorkProject[]>('/works');
});

export const fetchWorkById = createAsyncThunk('works/fetchWorkById', async (id: string) => {
  return await api.get<WorkProject>(`/works/${id}`);
});

export const createWorkAction = createAsyncThunk('works/createWork', async (data: Partial<WorkProject>) => {
  return await api.post<WorkProject>('/works', data);
});

export const updateWorkAction = createAsyncThunk(
  'works/updateWork',
  async ({ id, data }: { id: string; data: Partial<WorkProject> }) => {
    return await api.put<WorkProject>(`/works/${id}`, data);
  }
);

export const deleteWorkAction = createAsyncThunk('works/deleteWork', async (id: string) => {
  await api.delete(`/works/${id}`);
  return id;
});

const worksSlice = createSlice({
  name: 'works',
  initialState,
  reducers: {
    setSelectedWork: (state, action) => {
      state.selectedWork = action.payload;
    },
    clearSelectedWork: (state) => {
      state.selectedWork = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.works = action.payload;
      })
      .addCase(fetchWorks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch works';
      })
      .addCase(createWorkAction.fulfilled, (state, action) => {
        state.works.unshift(action.payload);
      })
      .addCase(updateWorkAction.fulfilled, (state, action) => {
        const index = state.works.findIndex((w) => w.id === action.payload.id);
        if (index !== -1) {
          state.works[index] = action.payload;
        }
        if (state.selectedWork?.id === action.payload.id) {
          state.selectedWork = action.payload;
        }
      })
      .addCase(deleteWorkAction.fulfilled, (state, action) => {
        state.works = state.works.filter((w) => w.id !== action.payload);
        if (state.selectedWork?.id === action.payload) {
          state.selectedWork = null;
        }
      });
  },
});

export const { setSelectedWork, clearSelectedWork } = worksSlice.actions;
export default worksSlice.reducer;
