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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-x-hidden overflow-y-auto transition-colors duration-200">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-4 sm:right-10 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Theme Toggle Top Right */}
      <div className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-20">
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white shadow-md transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />}
        </button>
      </div>

      {/* Main Card: Left Image + Right Form */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 overflow-hidden my-auto grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Brand Image Presentation */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-6 sm:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden min-h-[260px] md:min-h-[540px]">
          {/* Subtle Ambient Highlights */}
          <div className="absolute -top-20 -left-20 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Pill */}
          <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-blue-200 backdrop-blur-sm shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Dual-Partner Secure Enclave</span>
          </div>

          {/* Central Logo & Image Showcase */}
          <div className="relative z-10 my-auto py-4 sm:py-6 flex flex-col items-center justify-center space-y-4">
            <div className="p-3 sm:p-4 bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl max-w-[240px] sm:max-w-[300px] transition-transform hover:scale-[1.02] duration-300">
              <img
                src={logoImg}
                alt="Loosers"
                className="w-full h-auto max-h-48 sm:max-h-56 object-contain rounded-xl drop-shadow-2xl"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Loosers</h2>
              <p className="text-xs text-blue-200/80 font-medium max-w-xs mx-auto leading-relaxed">
                Dual-Partner High-Security Business, Passwords & Emergency Vault
              </p>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 mt-auto pt-3 flex items-center justify-center gap-1.5 text-[11px] text-blue-300/80 border-t border-white/10 w-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>AES-256-GCM Envelope Encryption</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-6 sm:p-10 flex flex-col justify-center space-y-5 sm:space-y-6 bg-white dark:bg-slate-900">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sign In</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your credentials to access the secure partner enclave
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
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
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
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
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
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:translate-y-[-1px] mt-1"
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
        </div>
      </div>
    </div>
  );
};
