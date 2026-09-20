import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchVaultItems,
  createVaultItemAction,
  updateVaultItemAction,
  revealVaultPasswordAction,
  maskPassword,
} from '../store/slices/vaultSlice';
import { showToast } from '../store/slices/uiSlice';
import { DeleteVaultItemModal } from '../components/Modals/DeleteVaultItemModal';
import { VaultItem } from '../types';
import {
  KeyRound,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Trash2,
  Pencil,
  Lock,
  X,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const PasswordsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, revealedPasswords, isLoading } = useSelector((state: RootState) => state.vault);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<VaultItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Form State
  const [accountName, setAccountName] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dispatch(fetchVaultItems(search));
  }, [dispatch, search]);

  // Countdown timer effect for revealed passwords
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      Object.entries(revealedPasswords).forEach(([id, data]) => {
        if (data.expiryTime <= now) {
          dispatch(maskPassword(id));
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [revealedPasswords, dispatch]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setAccountName('');
    setUsernameOrEmail('');
    setPassword('');
    setWebsiteUrl('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: VaultItem) => {
    setEditingItem(item);
    setAccountName(item.accountName);
    setUsernameOrEmail(item.usernameOrEmail);
    setPassword('');
    setWebsiteUrl(item.websiteUrl || '');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleReveal = async (item: VaultItem) => {
    setRevealingId(item.id);
    try {
      await dispatch(revealVaultPasswordAction(item.id)).unwrap();
      dispatch(showToast({ message: `Password for "${item.accountName}" revealed! (Auto-masks in 30s)`, type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to reveal password', type: 'error' }));
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    dispatch(showToast({ message: 'Password copied to clipboard!', type: 'info' }));
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}';
    let generated = '';
    for (let i = 0; i < 20; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await dispatch(
          updateVaultItemAction({
            id: editingItem.id,
            data: {
              accountName,
              usernameOrEmail,
              websiteUrl: websiteUrl || null,
              notes: notes || null,
              ...(password ? { password } : {}),
            },
          })
        ).unwrap();
        dispatch(showToast({ message: 'Encrypted credential updated successfully', type: 'success' }));
      } else {
        await dispatch(
          createVaultItemAction({
            accountName,
            usernameOrEmail,
            password,
            websiteUrl: websiteUrl || undefined,
            notes: notes || undefined,
          })
        ).unwrap();
        dispatch(showToast({ message: 'Encrypted credential saved', type: 'success' }));
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setAccountName('');
      setUsernameOrEmail('');
      setPassword('');
      setWebsiteUrl('');
      setNotes('');
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to save vault entry', type: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted Password Vault</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            AES-256-GCM envelope encryption with instant reveal and password-confirmed deletion.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Password Entry</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <strong className="text-slate-900 dark:text-white">Encrypted at Rest:</strong>{' '}
            <span className="text-slate-500 dark:text-slate-400">
              Passwords are fully masked by default. Credential deletion requires explicit account password authorization to prevent accidental removal.
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search accounts, usernames, URLs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
        />
      </div>

      {/* Password Vault Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Lock className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Vault Is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Store Gmail, cloud root credentials, billing API keys, and server master access codes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const revealed = revealedPasswords[item.id];
            const secondsLeft = revealed ? Math.max(0, Math.ceil((revealed.expiryTime - Date.now()) / 1000)) : 0;
            const isRevealing = revealingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl flex flex-col justify-between transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{item.accountName}</h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{item.usernameOrEmail}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition"
                        title="Edit Credential"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Password Reveal Field */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="font-mono text-sm tracking-wider select-all overflow-x-auto text-slate-800 dark:text-slate-200">
                      {revealed ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{revealed.password}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">{item.maskedPassword}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {revealed ? (
                        <>
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                            {secondsLeft}s
                          </span>
                          <button
                            onClick={() => handleCopy(item.id, revealed.password)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200 dark:bg-slate-800 rounded-lg transition"
                            title="Copy Password"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => dispatch(maskPassword(item.id))}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200 dark:bg-slate-800 rounded-lg transition"
                            title="Hide Password"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReveal(item)}
                          disabled={isRevealing}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        >
                          {isRevealing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>Reveal</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/60 leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  {item.websiteUrl ? (
                    <a
                      href={item.websiteUrl.startsWith('http') ? item.websiteUrl : `https://${item.websiteUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{item.websiteUrl.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ) : (
                    <span>No link provided</span>
                  )}
                  <span>By {item.owner?.name || 'Partner'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shrink-0">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Encrypted Credential' : 'Save Encrypted Credential'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingItem
                      ? 'Update credential details or re-encrypt with a new password'
                      : 'Encrypted with AES-256-GCM before database write'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Account / Service Name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Google Cloud Org Master / Stripe Live"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Username or Email</label>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin@looser.vault"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {editingItem ? 'New Password (Leave blank to keep unchanged)' : 'Password / Secret Key'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <input
                  type="text"
                  required={!editingItem}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingItem ? 'Leave blank to retain current encrypted password...' : '••••••••••••'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 font-mono text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Website URL (Optional)</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://dashboard.example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Security Notes / Recovery Context</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Includes 2FA backup seed, YubiKey serial, or billing context..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30 transition"
                >
                  {editingItem ? 'Update & Save' : 'Encrypt & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vault Item Confirmation Modal */}
      {deletingItem && (
        <DeleteVaultItemModal
          item={deletingItem}
          onClose={() => setDeletingItem(null)}
        />
      )}
    </div>
  );
};
