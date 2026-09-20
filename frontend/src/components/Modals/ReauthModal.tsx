import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { closeReauthModal, showToast } from '../../store/slices/uiSlice';
import { setReauthSuccess } from '../../store/slices/authSlice';
import { api } from '../../services/api';
import { ShieldCheck, Lock, X, Loader2 } from 'lucide-react';

export const ReauthModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isOpen = useSelector((state: RootState) => state.ui.isReauthModalOpen);
  const user = useSelector((state: RootState) => state.auth.user);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/reauth', { password });
      dispatch(setReauthSuccess(res));
      dispatch(closeReauthModal());
      dispatch(showToast({ message: 'Identity confirmed! Vault credentials unlocked for 5 minutes.', type: 'success' }));
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900/60 dark:to-indigo-900/60 p-4 sm:p-5 border-b border-blue-500/30 dark:border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-white/20 dark:bg-blue-500/20 text-white dark:text-blue-400 border border-white/30 dark:border-blue-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate">Security Verification</h3>
              <p className="text-[11px] sm:text-xs text-blue-100 dark:text-blue-200 truncate">Re-authenticate to reveal sensitive credential</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(closeReauthModal())}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
            Confirm your primary vault password for <span className="text-blue-600 dark:text-blue-400 font-semibold">{user?.email}</span> to proceed. Decrypted passwords auto-mask after 30 seconds.
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Your Account Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => dispatch(closeReauthModal())}
              className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verify & Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
