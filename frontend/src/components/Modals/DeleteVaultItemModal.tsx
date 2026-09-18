import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { deleteVaultItemAction } from '../../store/slices/vaultSlice';
import { showToast } from '../../store/slices/uiSlice';
import { VaultItem } from '../../types';
import {
  AlertTriangle,
  Lock,
  Trash2,
  X,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  item: VaultItem;
  onClose: () => void;
}

export const DeleteVaultItemModal: React.FC<Props> = ({ item, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await dispatch(deleteVaultItemAction({ id: item.id, password })).unwrap();
      dispatch(
        showToast({
          message: `Encrypted credential "${item.accountName}" has been permanently purged.`,
          type: 'info',
        })
      );
      onClose();
    } catch (err: any) {
      setError(err || 'Incorrect account password. Deletion aborted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 dark:from-red-950 dark:via-slate-900 dark:to-red-950/80 p-4 sm:p-5 border-b border-red-500/30 dark:border-red-900/40 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white/20 dark:bg-red-500/20 text-white dark:text-red-400 border border-white/30 dark:border-red-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100 dark:text-red-400 block truncate">
                Security Purge Authorization
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">Permanent Deletion</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmDelete} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target Item Summary Box */}
          <div className="bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Credential:</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {item.accountName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
              <span>Account / Email:</span>
              <span className="truncate max-w-[200px]">{item.usernameOrEmail}</span>
            </div>
          </div>

          {/* Warning banner */}
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-3.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong>Irreversible Action:</strong> This encrypted vault item, its AES-256 ciphertext, IVs, and attachments will be permanently deleted from the database.
            </div>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Password confirmation input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm Your Account Password ({user?.email})
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter your account password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Permanently Delete</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
