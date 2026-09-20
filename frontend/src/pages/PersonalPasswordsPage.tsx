import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchPersonalVaultItems,
  createPersonalVaultItemAction,
  updatePersonalVaultItemAction,
  revealPersonalVaultPasswordAction,
  deletePersonalVaultItemAction,
  maskPersonalPassword,
} from '../store/slices/personalVaultSlice';
import { showToast } from '../store/slices/uiSlice';
import { DeleteVaultItemModal } from '../components/Modals/DeleteVaultItemModal';
import { VaultItem } from '../types';
import {
  LockKeyhole,
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
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';

export const PersonalPasswordsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, revealedPasswords, isLoading } = useSelector((state: RootState) => state.personalVault);

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
    dispatch(fetchPersonalVaultItems(search));
  }, [dispatch, search]);

  // Countdown timer effect for revealed passwords
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      Object.entries(revealedPasswords).forEach(([id, data]) => {
        if (data.expiryTime <= now) {
          dispatch(maskPersonalPassword(id));
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
      await dispatch(revealPersonalVaultPasswordAction(item.id)).unwrap();
      dispatch(showToast({ message: `Personal password for "${item.accountName}" revealed! (Auto-masks in 30s)`, type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to reveal personal password', type: 'error' }));
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
          updatePersonalVaultItemAction({
            id: editingItem.id,
            data: {
              accountName,
              usernameOrEmail,
              password: password || undefined,
              websiteUrl,
              notes,
            },
          })
        ).unwrap();
        dispatch(showToast({ message: 'Personal credential updated successfully', type: 'success' }));
      } else {
        await dispatch(
          createPersonalVaultItemAction({
            accountName,
            usernameOrEmail,
            password,
            websiteUrl,
            notes,
          })
        ).unwrap();
        dispatch(showToast({ message: 'Personal credential encrypted & stored in vault', type: 'success' }));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to save personal credential', type: 'error' }));
    }
  };

  const handleDeleteConfirm = async (deletePassword: string) => {
    if (!deletingItem) return;
    try {
      await dispatch(
        deletePersonalVaultItemAction({
          id: deletingItem.id,
          password: deletePassword,
        })
      ).unwrap();
      dispatch(showToast({ message: `Credential "${deletingItem.accountName}" moved to Trash`, type: 'info' }));
      setDeletingItem(null);
    } catch (err: any) {
      dispatch(showToast({ message: err || 'Failed to delete personal credential', type: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30 shadow-xs">
                <LockKeyhole className="w-6 h-6" />
              </div>
              <span>Personal Passwords</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              AD Only
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adarsh's private personal credentials vault. Zero-knowledge encrypted with AES-256-GCM.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition self-start sm:self-auto cursor-pointer active:scale-95 touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          <span>New Personal Credential</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search personal accounts, usernames, websites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          {items.length} {items.length === 1 ? 'Credential' : 'Credentials'} Stored
        </div>
      </div>

      {/* Credentials Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <LockKeyhole className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Personal Credentials Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Store your personal banking, private cloud, email, or trading passwords here safely. They are strictly hidden from other roles.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Store First Personal Password</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isRevealed = Boolean(revealedPasswords[item.id]);
            const revealedData = revealedPasswords[item.id];
            const isRevealing = revealingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {item.accountName}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                          Personal
                        </span>
                      </div>
                      {item.websiteUrl && (
                        <a
                          href={item.websiteUrl.startsWith('http') ? item.websiteUrl : `https://${item.websiteUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5 truncate"
                        >
                          <span className="truncate">{item.websiteUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition"
                        title="Edit Credential"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                        title="Delete Credential"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Username / Email Row */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-2">
                    <div className="text-[10px] text-slate-400 font-medium">Username / Login</div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate select-all">
                        {item.usernameOrEmail}
                      </span>
                      <button
                        onClick={() => handleCopy(`user_${item.id}`, item.usernameOrEmail)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        title="Copy Username"
                      >
                        {copiedId === `user_${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Row */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-0.5">
                      <span>Password</span>
                      {isRevealed && (
                        <span className="text-amber-500 font-mono text-[9px] animate-pulse">
                          Auto-masking in 30s
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200 tracking-wider truncate select-all">
                        {isRevealed ? revealedData.password : '••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isRevealed ? (
                          <>
                            <button
                              onClick={() => handleCopy(`pass_${item.id}`, revealedData.password)}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200 dark:bg-slate-800 rounded-lg transition"
                              title="Copy Plaintext Password"
                            >
                              {copiedId === `pass_${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => dispatch(maskPersonalPassword(item.id))}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200 dark:bg-slate-800 rounded-lg transition"
                              title="Mask Immediately"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReveal(item)}
                            disabled={isRevealing}
                            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200 dark:bg-slate-800 rounded-lg transition"
                            title="Reveal Password"
                          >
                            {isRevealing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes Preview */}
                  {item.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed italic">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Timestamp */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    AES-256
                  </span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Personal Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shrink-0">
                  <LockKeyhole className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Personal Credential' : 'Save Personal Credential'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Encrypted with AES-256-GCM. Restricted strictly to Adarsh (AD).
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
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Account / Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Personal Banking / Personal Gmail / Trading Master"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Username or Email *
                </label>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. adarsh@personal.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {editingItem ? 'New Password (Leave blank to keep unchanged)' : 'Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required={!editingItem}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter or generate strong password..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Website URL (Optional)
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://app.example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Security Notes / Recovery Keys (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Personal recovery codes, pin numbers, security answers..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/20 active:scale-95 touch-manipulation"
                >
                  {editingItem ? 'Update Credential' : 'Encrypt & Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <DeleteVaultItemModal
          item={deletingItem}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};
