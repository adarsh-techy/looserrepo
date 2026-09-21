import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SecurityAlert } from '../../types';

interface UiState {
  theme: 'dark' | 'light';
  colorTheme: 'default' | 'red-white';
  isThemeModalOpen: boolean;
  isSignOutModalOpen: boolean;
  isSecretNotesVisible: boolean;
  isMobileSidebarOpen: boolean;
  activeSirenAlert: SecurityAlert | null;
  isReauthModalOpen: boolean;
  reauthActionCallbackId: string | null;
  isSirenMuted: boolean;
  activeToast: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
}

const savedTheme = localStorage.getItem('looser_theme') as 'dark' | 'light' | null;
const initialTheme: 'dark' | 'light' = savedTheme || 'dark';

const savedColorTheme = (localStorage.getItem('looser_color_theme') as 'default' | 'red-white' | null) || 'default';
const savedSecretNotesVisible = localStorage.getItem('looser_secret_notes_visible') === 'true';

// Apply theme classes to document element on startup
if (typeof document !== 'undefined') {
  if (savedColorTheme === 'red-white') {
    document.documentElement.classList.add('theme-red-white');
    // When red-white theme is active, light/white styling takes place
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.remove('theme-red-white');
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

const initialState: UiState = {
  theme: initialTheme,
  colorTheme: savedColorTheme,
  isThemeModalOpen: false,
  isSignOutModalOpen: false,
  isSecretNotesVisible: savedSecretNotesVisible,
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
      // Only toggle dark class on html if we are not in red-white theme
      if (state.colorTheme !== 'red-white') {
        if (state.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
      localStorage.setItem('looser_theme', action.payload);
      if (state.colorTheme !== 'red-white') {
        if (action.payload === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    setColorTheme: (state, action: PayloadAction<'default' | 'red-white'>) => {
      state.colorTheme = action.payload;
      localStorage.setItem('looser_color_theme', action.payload);
      if (action.payload === 'red-white') {
        document.documentElement.classList.add('theme-red-white');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('theme-red-white');
        if (state.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    openThemeModal: (state) => {
      state.isThemeModalOpen = true;
    },
    closeThemeModal: (state) => {
      state.isThemeModalOpen = false;
    },
    openSignOutModal: (state) => {
      state.isSignOutModalOpen = true;
    },
    closeSignOutModal: (state) => {
      state.isSignOutModalOpen = false;
    },
    toggleSecretNotesVisibility: (state) => {
      state.isSecretNotesVisible = !state.isSecretNotesVisible;
      localStorage.setItem('looser_secret_notes_visible', String(state.isSecretNotesVisible));
    },
    setSecretNotesVisibility: (state, action: PayloadAction<boolean>) => {
      state.isSecretNotesVisible = action.payload;
      localStorage.setItem('looser_secret_notes_visible', String(action.payload));
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
  setColorTheme,
  openThemeModal,
  closeThemeModal,
  openSignOutModal,
  closeSignOutModal,
  toggleSecretNotesVisibility,
  setSecretNotesVisibility,
  triggerSecuritySiren,
  dismissSecuritySiren,
  openReauthModal,
  closeReauthModal,
  toggleSirenMute,
  showToast,
  clearToast,
} = uiSlice.actions;

export default uiSlice.reducer;
