import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { setAuthSuccess } from '../store/slices/authSlice';
import { toggleTheme, showToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { ShieldCheck, Lock, Mail, KeyRound, Loader2, ArrowRight, Sun, Moon } from 'lucide-react';
import logoImg from '../assets/a.png';

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
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-slate-950 overflow-x-hidden transition-colors duration-200 relative">
      {/* Theme Toggle Top Right (Fixed for seamless access on both mobile and desktop) */}
      <div className="fixed top-3.5 right-3.5 sm:top-6 sm:right-6 z-30">
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white shadow-lg transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />}
        </button>
      </div>

      {/* Left Side: Full-Screen on Desktop, Sleek Hero Banner on Mobile */}
      <div className="relative w-full md:w-1/2 h-48 sm:h-64 md:h-screen md:min-h-screen bg-slate-950 overflow-hidden shrink-0">
        <img
          src={logoImg}
          alt="Loosers"
          className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
        />
        {/* Subtle cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-black/20 pointer-events-none" />

        {/* Floating Brand Badge on the Image */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold text-white shadow-xl">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            <span>Loosers Secure Enclave</span>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-10 hidden md:flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 text-xs font-medium text-white shadow-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>AES-256-GCM Envelope Encryption</span>
          </div>
        </div>
      </div>

      {/* Right Side: Form Column */}
      <div className="w-full md:w-1/2 min-h-[calc(100vh-12rem)] md:min-h-screen flex flex-col justify-center items-center px-5 py-6 sm:px-12 lg:px-16 relative bg-white dark:bg-slate-950 transition-colors duration-200">
        {/* Centered Form Container */}
        <div className="w-full max-w-sm sm:max-w-md space-y-5 sm:space-y-6 my-auto py-4 sm:py-8">
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

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Partner Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter partner email address..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Account Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password..."
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

          <div className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Don't have a partner account?{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Register here
            </Link>
          </div>

          <div className="pt-1 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>AES-256-GCM Envelope Encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};
