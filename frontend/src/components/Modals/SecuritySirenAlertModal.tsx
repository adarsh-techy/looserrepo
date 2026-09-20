import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { dismissSecuritySiren, toggleSirenMute } from '../../store/slices/uiSlice';
import { sirenAudio } from '../../services/sirenAudio';
import { AlertTriangle, Volume2, VolumeX, ShieldAlert, CheckCircle, BellRing } from 'lucide-react';

export const SecuritySirenAlertModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeAlert = useSelector((state: RootState) => state.ui.activeSirenAlert);
  const isSirenMuted = useSelector((state: RootState) => state.ui.isSirenMuted);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (activeAlert) {
      if (!isSirenMuted && activeAlert.requiresSiren) {
        sirenAudio.playSiren(12);
        setIsPlaying(true);
      }
    } else {
      sirenAudio.stop();
      setIsPlaying(false);
    }

    return () => {
      sirenAudio.stop();
    };
  }, [activeAlert, isSirenMuted]);

  if (!activeAlert) return null;

  const handleDismiss = () => {
    sirenAudio.stop();
    setIsPlaying(false);
    dispatch(dismissSecuritySiren());
  };

  const handleToggleAudio = () => {
    if (isPlaying) {
      sirenAudio.stop();
      setIsPlaying(false);
      dispatch(toggleSirenMute());
    } else {
      dispatch(toggleSirenMute());
      sirenAudio.playSiren(10);
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/80 backdrop-blur-lg p-3 sm:p-4 animate-pulse-fast overflow-y-auto">
      <div className="bg-slate-950 border-2 border-red-600 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(239,68,68,0.6)] overflow-hidden text-slate-100 max-h-[92dvh] flex flex-col my-auto">
        {/* Top Warning Banner */}
        <div className="bg-red-600 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-black/20 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-base sm:text-xl uppercase tracking-wider truncate">CRITICAL SECURITY ALERT</h2>
              <p className="text-[10px] sm:text-xs text-red-100 font-medium truncate">Owner alert across active sessions</p>
            </div>
          </div>
          <button
            onClick={handleToggleAudio}
            className="p-2 rounded-xl bg-red-700 hover:bg-red-800 text-white transition flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title={isPlaying ? "Silence Siren" : "Unmute Siren"}
          >
            {isPlaying ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-200" />}
            <span className="hidden sm:inline">{isPlaying ? "Siren Active" : "Muted"}</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Event: {activeAlert.eventType}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {activeAlert.message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 block mb-1">Target Secret Note:</span>
              <span className="font-semibold text-white truncate block">{activeAlert.noteTitle}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 block mb-1">Triggered By:</span>
              <span className="font-semibold text-white truncate block">{activeAlert.actorEmail}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 col-span-2">
              <span className="text-slate-500 block mb-1">Timestamp:</span>
              <span className="font-mono text-slate-300">{new Date(activeAlert.timestamp).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2">
            <BellRing className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>Note: This security event has been logged to the immutable tamper-evident audit log without exposing sensitive note contents.</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={handleDismiss}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/40 transition"
            >
              <CheckCircle className="w-5 h-5" />
              Acknowledge & Silence Siren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
