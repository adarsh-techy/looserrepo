import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import {
  closeSignOutModal,
  toggleSecretNotesVisibility,
  showToast,
} from '../../store/slices/uiSlice';
import { LogOut, X, AlertTriangle } from 'lucide-react';

export const SignOutModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isOpen = useSelector((state: RootState) => state.ui.isSignOutModalOpen);
  const isSecretNotesVisible = useSelector(
    (state: RootState) => state.ui.isSecretNotesVisible
  );

  const [clickCount, setClickCount] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers and reset click count when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setClickCount(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setClickCount(0);
    dispatch(closeSignOutModal());
  };

  const handleYesClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    // If there is an existing timer, clear it
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // SECRET TRIGGER: 3 clicks on "Yes" unhides/toggles Secret Notes & My Secret Notes
    if (nextCount >= 3) {
      setClickCount(0);
      dispatch(closeSignOutModal());
      dispatch(toggleSecretNotesVisibility());

      dispatch(
        showToast({
          message: !isSecretNotesVisible
            ? '🔓 Secret Notes & My Secret Notes are now visible in the sidebar!'
            : '🔒 Secret Notes & My Secret Notes are now hidden from the sidebar.',
          type: 'success',
        })
      );
      return;
    }

    // Since this is the dummy Sign Out modal, single/double click does NOT log out.
    // Give user 1500ms window to click 3 times. If not reached, smoothly close the modal.
    timerRef.current = setTimeout(() => {
      setClickCount(0);
      dispatch(closeSignOutModal());
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Sign Out</h2>
              <p className="text-xs text-red-100 font-medium">Session termination</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/15 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold text-red-900 dark:text-red-200">
                Are you sure you want to sign out?
              </p>
              <p className="text-red-700 dark:text-red-400 leading-relaxed text-xs">
                Your secure workspace session will be closed. You will need to re-authenticate with your master credentials to regain access.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleYesClick}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition shadow-lg shadow-red-500/25 cursor-pointer active:scale-95 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Yes, Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
