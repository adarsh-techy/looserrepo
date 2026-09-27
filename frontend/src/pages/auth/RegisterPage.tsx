import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { setAuthSuccess } from '../../store/slices/core/authSlice';
import { toggleTheme, showToast } from '../../store/slices/core/uiSlice';
import { api } from '../../services/api';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import logoImg from '../../assets/a.png';

export const RegisterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useSelector((state: RootState) => state.ui.theme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'AD' | 'NS'>('AD');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      dispatch(setAuthSuccess(res));
      dispatch(showToast({ message: `Account created successfully! Welcome, ${res.user.name}!`, type: 'success' }));
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
      <div className="relative w-full md:w-1/2 h-36 sm:h-56 md:h-[100dvh] md:min-h-screen bg-slate-950 overflow-hidden shrink-0 shadow-[0_16px_32px_-4px_rgba(255,255,255,0.75)] z-10">
        <img
          src={logoImg}
          alt="Loosers Vault"
          className="w-full h-full object-cover object-left transition-transform duration-700 hover:scale-105"
        />
        {/* Subtle cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/10 pointer-events-none" />

        {/* White Shadow / Luminous Fade on mobile */}
        <div className="absolute bottom-0 left-0 right-0 h-14 sm:h-20 md:hidden bg-gradient-to-t from-white/90 via-white/40 to-transparent pointer-events-none" />
      </div>

      {/* Right Side: Form Column */}
      <div
        className="w-full md:w-1/2 flex-1 md:min-h-[100dvh] flex flex-col justify-center items-center px-4 py-6 sm:px-12 lg:px-16 relative bg-white dark:bg-slate-950 transition-colors duration-200"
        style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 1.5rem), 1.5rem)' }}
      >
        {/* Centered Form Container */}
        <div className="w-full max-w-sm sm:max-w-md space-y-4 sm:space-y-5 my-auto py-2 sm:py-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Create Account</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Register as an AD or NS partner to join the encrypted vault.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-xs leading-relaxed animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. partner@looser.vault"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
              </div>
            </div>

            {/* Partner Role Selector (AD vs NS) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Select Partner Role</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">AD or NS</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* AD Role Option */}
                <button
                  type="button"
                  onClick={() => setRole('AD')}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                    role === 'AD'
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-sm'
                      : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-blue-900 dark:bg-blue-800 text-white text-[11px] font-black shadow-xs">
                      AD
                    </span>
                    {role === 'AD' && (
                      <span className="p-0.5 rounded-full bg-blue-600 text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Managing Partner</p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Full system master access</span>
                </button>

                {/* NS Role Option */}
                <button
                  type="button"
                  onClick={() => setRole('NS')}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                    role === 'NS'
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
                      : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-800 dark:bg-emerald-700 text-white text-[11px] font-black shadow-xs">
                      NS
                    </span>
                    {role === 'NS' && (
                      <span className="p-0.5 rounded-full bg-emerald-600 text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Partner</p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Collaborative partner access</span>
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Confirm Password</label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:translate-y-[-1px] mt-2 cursor-pointer touch-manipulation"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Create Partner Account</span>
            </button>
          </form>

          {/* Link to Login Page */}
          <div className="pt-2 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition inline-flex items-center gap-1"
              >
                <span>Sign In here</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
