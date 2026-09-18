import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, SharedNote } from '../../types';
import { api } from '../../services/api';

export interface PartnerStatus {
  partner: User | null;
  hoursSinceCheckIn: number;
  minutesSinceCheckIn?: number;
  isReachable: boolean;
  isAliveAndActive?: boolean;
  statusText: string;
  latestActivity?: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    createdAt?: string;
    eventType?: string;
  } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  reauthToken: string | null;
  reauthExpiry: number | null;
  isLoading: boolean;
  error: string | null;
  unreadLoginNotes: SharedNote[];
  partnerStatus: PartnerStatus | null;
}

const initialToken = localStorage.getItem('looser_token');
const initialReauthToken = sessionStorage.getItem('looser_reauth_token');
const initialReauthExpiry = sessionStorage.getItem('looser_reauth_expiry');

const initialState: AuthState = {
  user: null,
  token: initialToken,
  reauthToken: initialReauthToken,
  reauthExpiry: initialReauthExpiry ? parseInt(initialReauthExpiry, 10) : null,
  isLoading: false,
  error: null,
  unreadLoginNotes: [],
  partnerStatus: null,
};

export const fetchProfile = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<User>('/auth/profile');
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch profile');
    }
  }
);

export const fetchPartnerStatus = createAsyncThunk<PartnerStatus, void, { rejectValue: string }>(
  'auth/fetchPartnerStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<PartnerStatus>('/users/partner-status');
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const ownerCheckInAction = createAsyncThunk<{ success: boolean; lastCheckIn: string }, void, { rejectValue: string }>(
  'auth/checkIn',
  async (_, { rejectWithValue }) => {
    try {
      return await api.post('/auth/checkin');
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const updatePreferencesAction = createAsyncThunk<{ success: boolean; user: Partial<User> }, any, { rejectValue: string }>(
  'auth/updatePreferences',
  async (prefs: any, { rejectWithValue }) => {
    try {
      return await api.patch('/auth/preferences', prefs);
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSuccess: (state, action: PayloadAction<{ user: User; token: string; unreadSharedNotes?: SharedNote[] }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.unreadLoginNotes = action.payload.unreadSharedNotes || [];
      state.error = null;
      localStorage.setItem('looser_token', action.payload.token);
    },
    setReauthSuccess: (state, action: PayloadAction<{ reauthToken: string; expiresInSeconds: number }>) => {
      const expiry = Date.now() + action.payload.expiresInSeconds * 1000;
      state.reauthToken = action.payload.reauthToken;
      state.reauthExpiry = expiry;
      sessionStorage.setItem('looser_reauth_token', action.payload.reauthToken);
      sessionStorage.setItem('looser_reauth_expiry', expiry.toString());
    },
    clearReauth: (state) => {
      state.reauthToken = null;
      state.reauthExpiry = null;
      sessionStorage.removeItem('looser_reauth_token');
      sessionStorage.removeItem('looser_reauth_expiry');
    },
    dismissLoginNotes: (state) => {
      state.unreadLoginNotes = [];
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.reauthToken = null;
      state.reauthExpiry = null;
      state.unreadLoginNotes = [];
      localStorage.removeItem('looser_token');
      sessionStorage.removeItem('looser_reauth_token');
      sessionStorage.removeItem('looser_reauth_expiry');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPartnerStatus.fulfilled, (state, action: PayloadAction<PartnerStatus>) => {
        state.partnerStatus = action.payload;
      })
      .addCase(ownerCheckInAction.fulfilled, (state, action) => {
        if (state.user) {
          state.user.lastCheckIn = action.payload.lastCheckIn;
        }
      })
      .addCase(updatePreferencesAction.fulfilled, (state, action) => {
        if (state.user && action.payload.user) {
          state.user = { ...state.user, ...action.payload.user };
        }
      });
  },
});

export const { setAuthSuccess, setReauthSuccess, clearReauth, dismissLoginNotes, logout } = authSlice.actions;
export default authSlice.reducer;
