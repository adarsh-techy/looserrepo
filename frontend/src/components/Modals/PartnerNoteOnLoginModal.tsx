import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { dismissLoginNotes } from '../../store/slices/authSlice';
import { markSharedNoteReadAction } from '../../store/slices/sharedNotesSlice';
import { MessageSquareText, Check, Clock, User, X } from 'lucide-react';

export const PartnerNoteOnLoginModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const unreadNotes = useSelector((state: RootState) => state.auth.unreadLoginNotes);

  if (!unreadNotes || unreadNotes.length === 0) return null;

  const currentNote = unreadNotes[0];

  const handleAcknowledge = async () => {
    await dispatch(markSharedNoteReadAction(currentNote.id));
    dispatch(dismissLoginNotes());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 dark:from-indigo-950 dark:via-purple-950 dark:to-slate-950 p-4 sm:p-6 border-b border-indigo-500/30 dark:border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white/20 dark:bg-indigo-500/20 text-white dark:text-indigo-400 border border-white/30 dark:border-indigo-500/30 shrink-0">
              <MessageSquareText className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-100 dark:text-indigo-400 block truncate">Important Message</span>
              <h3 className="font-extrabold text-base sm:text-xl text-white truncate">Partner Left A Note</h3>
            </div>
          </div>
          <button
            onClick={() => dispatch(dismissLoginNotes())}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>From: <strong className="text-slate-900 dark:text-white">{currentNote.author?.name || 'Your Partner'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(currentNote.createdAt).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{currentNote.title}</h4>
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {currentNote.content}
            </div>
          </div>

          {currentNote.reminderDate && (
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Scheduled Reminder: {new Date(currentNote.reminderDate).toLocaleDateString()}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={() => dispatch(dismissLoginNotes())}
              className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Remind Me Later
            </button>
            <button
              onClick={handleAcknowledge}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <Check className="w-4 h-4" />
              Mark as Read & Send Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
