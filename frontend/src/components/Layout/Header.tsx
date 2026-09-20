import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { toggleTheme, toggleSirenMute, showToast, toggleMobileSidebar } from '../../store/slices/uiSlice';
import { sirenAudio } from '../../services/sirenAudio';
import {
  Menu,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Clock,
  ArrowLeft,
} from 'lucide-react';

export const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const isSirenMuted = useSelector((state: RootState) => state.ui.isSirenMuted);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Live ticking date and time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTestSiren = () => {
    if (isSirenMuted) {
      dispatch(showToast({ message: 'Siren sound is currently muted in your preferences', type: 'warning' }));
    } else {
      sirenAudio.playSiren(3);
      dispatch(showToast({ message: 'Playing 3-second security siren test sound...', type: 'info' }));
    }
  };

  return (
    <header className="shrink-0 h-14 sm:h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-20 transition-colors duration-200">
      {/* Left side: Back Button + Hamburger on mobile + Mini Brand */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
        {/* Universal Back Button across all pages (Desktop/Tablet only) */}
        <button
          onClick={() => navigate(-1)}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0 active:scale-95 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
          title="Go back to previous page"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-xs font-bold">Back</span>
        </button>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => dispatch(toggleMobileSidebar())}
          className="md:hidden p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 active:scale-95"
          title="Open Vault Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden flex items-center gap-1 font-black text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white truncate">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Loosers</span>
          <span className="text-[9px] px-1 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-medium border border-blue-500/20">Vault</span>
        </div>
      </div>

      {/* Action Controls (Right side) */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Live Current Date & Time Display */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-1 text-xs font-medium text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
            <span className="inline lg:hidden">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="hidden lg:inline">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-600">|</span>
          <span className="hidden md:inline font-medium text-slate-600 dark:text-slate-300 text-[11px]">
            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Siren Sound Toggle & Test */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shrink-0">
          <button
            onClick={() => dispatch(toggleSirenMute())}
            title={isSirenMuted ? 'Siren Muted (Click to enable audio)' : 'Siren Audio Active (Click to mute)'}
            className={`p-1.5 sm:p-2 rounded-lg text-xs font-semibold transition ${
              isSirenMuted ? 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300' : 'text-amber-500 dark:text-yellow-400 hover:text-amber-600 dark:hover:text-yellow-300'
            }`}
          >
            {isSirenMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleTestSiren}
            title="Play Siren Test Sound"
            className="hidden sm:block px-2 sm:px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition whitespace-nowrap"
          >
            Test Siren
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800 shrink-0"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};

