import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SecurityAlert } from '../../types';

interface UiState {
  theme: 'dark' | 'light';
  isMobileSidebarOpen: boolean;
  activeSirenAlert: SecurityAlert | null;
  isReauthModalOpen: boolean;
  reauthActionCallbackId: string | null;
  isSirenMuted: boolean;
  activeToast: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
}

const savedTheme = localStorage.getItem('looser_theme') as 'dark' | 'light' | null;
const initialTheme: 'dark' | 'light' = savedTheme || 'dark';

// Apply theme class to document element on startup
if (typeof document !== 'undefined') {
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const initialState: UiState = {
  theme: initialTheme,
  isMobileSidebarOpen: false,
  activeSirenAlert: null,
  isReauthModalOpen: false,
  reauthActionCallbackId: null,
  isSirenMuted: false,
  activeToast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileSidebar: (state) => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileSidebarOpen = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('looser_theme', state.theme);
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
      localStorage.setItem('looser_theme', action.payload);
      if (action.payload === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    triggerSecuritySiren: (state, action: PayloadAction<SecurityAlert>) => {
      state.activeSirenAlert = action.payload;
    },
    dismissSecuritySiren: (state) => {
      state.activeSirenAlert = null;
    },
    openReauthModal: (state, action: PayloadAction<string | undefined>) => {
      state.isReauthModalOpen = true;
      state.reauthActionCallbackId = action.payload || null;
    },
    closeReauthModal: (state) => {
      state.isReauthModalOpen = false;
      state.reauthActionCallbackId = null;
    },
    toggleSirenMute: (state) => {
      state.isSirenMuted = !state.isSirenMuted;
    },
    showToast: (state, action: PayloadAction<{ message: string; type?: 'success' | 'error' | 'info' | 'warning' }>) => {
      state.activeToast = {
        message: action.payload.message,
        type: action.payload.type || 'info',
      };
    },
    clearToast: (state) => {
      state.activeToast = null;
    },
  },
});

export const {
  toggleMobileSidebar,
  setMobileSidebarOpen,
  toggleTheme,
  setTheme,
  triggerSecuritySiren,
  dismissSecuritySiren,
  openReauthModal,
  closeReauthModal,
  toggleSirenMute,
  showToast,
  clearToast,
} = uiSlice.actions;

export default uiSlice.reducer;
