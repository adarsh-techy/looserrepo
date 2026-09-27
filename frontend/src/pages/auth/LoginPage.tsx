import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setAuthSuccess } from '../../store/slices/core/authSlice';
import { toggleTheme, showToast } from '../../store/slices/core/uiSlice';
import { api } from '../../services/api';
import { Lock, Mail, KeyRound, Loader2, ArrowRight, Sun, Moon } from 'lucide-react';
import logoImg from '../../assets/a.png';

export const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
        totpCode: requires2FA ? totpCode.trim() : undefined,
      });

      if (res.requires2FA) {
        setRequires2FA(true);
        dispatch(showToast({ message: '2FA code required for account', type: 'info' }));
        setLoading(false);
        return;
      }

      dispatch(setAuthSuccess(res));
      dispatch(showToast({ message: `Welcome back, ${res.user.name}!`, type: 'success' }));
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-white dark:bg-slate-950 overflow-x-hidden transition-colors duration-200 relative">
      {/* Theme Toggle Top Right (Fixed for seamless access with safe-area offset) */}
      <div
        className="fixed z-30"
        style={{
          top: 'max(calc(env(safe-area-inset-top, 0px) + 0.75rem), 0.875rem)',
          right: 'max(calc(env(safe-area-inset-right, 0px) + 0.75rem), 0.875rem)',
        }}
      >
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white shadow-lg transition touch-manipulation cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />}
        </button>
      </div>

      {/* Left Side: 50% Screen on Desktop, Adaptive Banner on Mobile */}
      <div className="relative w-full md:w-1/2 h-44 sm:h-64 md:h-[100dvh] md:min-h-screen bg-slate-950 overflow-hidden shrink-0 shadow-[0_16px_32px_-4px_rgba(255,255,255,0.75)] z-10">
        <img
          src={logoImg}
          alt="Loosers"
          className="w-full h-full object-cover object-left transition-transform duration-700 hover:scale-105"
        />
        {/* Subtle cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/10 pointer-events-none" />

        {/* White Shadow / Luminous Fade at the end of the image on mobile */}
        <div className="absolute bottom-0 left-0 right-0 h-14 sm:h-20 md:hidden bg-gradient-to-t from-white/90 via-white/40 to-transparent pointer-events-none" />
      </div>

      {/* Right Side: Form Column */}
      <div
        className="w-full md:w-1/2 flex-1 md:min-h-[100dvh] flex flex-col justify-center items-center px-4 py-6 sm:px-12 lg:px-16 relative bg-white dark:bg-slate-950 transition-colors duration-200"
        style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 1.5rem), 1.5rem)' }}
      >
        {/* Centered Form Container */}
        <div className="w-full max-w-sm sm:max-w-md space-y-4 sm:space-y-6 my-auto py-2 sm:py-8">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Sign In</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Enter your partner credentials to access the secure enclave.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Quick Partner Prefill Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Partner Quick Fill
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Click to prefill email
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {/* Ns: Dark Green bg, text white */}
              <button
                type="button"
                id="prefill-ns-btn"
                onClick={() => {
                  setEmail('vishnuns@gmail.com');
                  setError(null);
                }}
                className={`group relative p-2.5 sm:p-3 rounded-2xl bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-md shadow-emerald-950/25 border border-emerald-600/40 transition-all text-left cursor-pointer ${
                  email === 'vishnuns@gmail.com'
                    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 shadow-emerald-800/40'
                    : ''
                }`}
                title="Prefill Ns - vishnuns@gmail.com"
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <span className="text-xs sm:text-sm font-black tracking-wide text-white">Ns</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 ring-2 ring-emerald-500/40 group-hover:scale-125 transition-transform" />
                </div>
                <p className="text-[10px] sm:text-[11px] text-emerald-100 font-medium truncate font-mono">
                  vishnuns@gmail.com
                </p>
              </button>

              {/* Ad: Dark Blue bg, text white */}
              <button
                type="button"
                id="prefill-ad-btn"
                onClick={() => {
                  setEmail('adarsh@gmail.com');
                  setError(null);
                }}
                className={`group relative p-2.5 sm:p-3 rounded-2xl bg-blue-900 hover:bg-blue-800 active:scale-[0.98] text-white shadow-md shadow-blue-950/25 border border-blue-700/40 transition-all text-left cursor-pointer ${
                  email === 'adarsh@gmail.com'
                    ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 shadow-blue-800/40'
                    : ''
                }`}
                title="Prefill Ad - adarsh@gmail.com"
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <span className="text-xs sm:text-sm font-black tracking-wide text-white">Ad</span>
                  <span className="w-2 h-2 rounded-full bg-blue-300 ring-2 ring-blue-500/40 group-hover:scale-125 transition-transform" />
                </div>
                <p className="text-[10px] sm:text-[11px] text-blue-100 font-medium truncate font-mono">
                  adarsh@gmail.com
                </p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
              </div>
            </div>

            {requires2FA && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">2FA Authenticator Code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-blue-500 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm text-slate-900 dark:text-white font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:translate-y-[-1px] mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {requires2FA ? 'Verify 2FA & Access Vault' : 'Sign In to Secure Enclave'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
