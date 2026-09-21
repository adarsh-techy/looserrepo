import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { closeThemeModal, setColorTheme, showToast } from '../../store/slices/uiSlice';
import {
  Palette,
  Check,
  X,
  Sparkles,
  SunMoon,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const ThemeConfirmModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isOpen = useSelector((state: RootState) => state.ui.isThemeModalOpen);
  const currentColorTheme = useSelector((state: RootState) => state.ui.colorTheme);

  // Default selection inside modal to the alternate theme
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'red-white'>(
    currentColorTheme === 'red-white' ? 'default' : 'red-white'
  );

  // Sync selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTheme(currentColorTheme === 'red-white' ? 'default' : 'red-white');
    }
  }, [isOpen, currentColorTheme]);

  if (!isOpen) return null;

  const handleApplyTheme = () => {
    dispatch(setColorTheme(selectedTheme));
    dispatch(closeThemeModal());

    if (selectedTheme === 'red-white') {
      dispatch(
        showToast({
          message: 'Crimson Red & White theme applied with ambient red shadow background!',
          type: 'success',
        })
      );
    } else {
      dispatch(
        showToast({
          message: 'Workspace reverted back to standard theme.',
          type: 'info',
        })
      );
    }
  };

  const isSwitchingToRedWhite = selectedTheme === 'red-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) dispatch(closeThemeModal());
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto animate-scale-up">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 sm:p-6 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">Workspace Theme</h2>
              <p className="text-xs sm:text-sm text-red-100 font-medium mt-0.5">
                Switch your visual style and page ambient lighting
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch(closeThemeModal())}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/15 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Desired Theme
            </label>

            {/* Option 1: Crimson Red & White Theme */}
            <div
              onClick={() => setSelectedTheme('red-white')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                selectedTheme === 'red-white'
                  ? 'border-red-500 bg-red-50/70 dark:bg-red-950/40 shadow-lg shadow-red-500/15 ring-2 ring-red-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-500/30">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Red & White Theme
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700/60">
                        Red Shadow BG
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Crisp clean white surfaces, crimson red accents & headers, with vibrant ambient red shadow background aura across pages.
                    </p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition ${
                    selectedTheme === 'red-white'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedTheme === 'red-white' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Visual preview swatch */}
              <div className="mt-3.5 pt-3 border-t border-red-200/60 dark:border-red-900/40 flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
                  <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                  <span>Crimson Red</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-white border border-slate-300 shadow-xs" />
                  <span>Pure White</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ambient Red Shadow Aura</span>
                </div>
              </div>
            </div>

            {/* Option 2: Default Theme */}
            <div
              onClick={() => setSelectedTheme('default')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedTheme === 'default'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-white dark:bg-slate-700 shadow-md">
                    <SunMoon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Default Theme
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Standard slate & blue corporate aesthetic with dark/light mode toggle.
                    </p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition ${
                    selectedTheme === 'default'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedTheme === 'default' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Prompt Details */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {isSwitchingToRedWhite
                  ? 'Confirm switch to Red & White Theme?'
                  : 'Confirm switch to Default Theme?'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 pl-5 leading-relaxed">
              {isSwitchingToRedWhite
                ? 'Click "Yes, Apply Red & White Theme" below to activate crimson styling with ambient red shadow lighting on all pages.'
                : 'Click "Yes, Reset to Default" to return to standard dark/light styling.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => dispatch(closeThemeModal())}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyTheme}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-lg cursor-pointer active:scale-95 flex items-center gap-2 ${
              isSwitchingToRedWhite
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isSwitchingToRedWhite ? 'Yes, Apply Red & White Theme' : 'Yes, Reset to Default'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
