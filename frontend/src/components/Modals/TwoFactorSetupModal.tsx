import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { fetchProfile } from '../../store/slices/authSlice';
import { showToast } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { QrCode, ShieldCheck, X, Loader2, Copy, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const TwoFactorSetupModal: React.FC<Props> = ({ onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSecret() {
      try {
        const res = await api.post('/auth/2fa/setup');
        setQrCode(res.qrCodeDataUrl);
        setSecret(res.secret);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize 2FA');
      }
    }
    loadSecret();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/2fa/verify', { code });
      dispatch(fetchProfile());
      dispatch(showToast({ message: '2FA successfully enabled!', type: 'success' }));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 shrink-0">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">Setup 2-Factor Auth (TOTP)</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Scan QR Code with Authenticator App</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs">
              {error}
            </div>
          )}

          {qrCode ? (
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-inner border border-slate-200 mx-auto w-fit">
              <img src={qrCode} alt="2FA QR Code" className="w-44 h-44" />
            </div>
          ) : (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {secret && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-300">
              <span className="truncate">{secret}</span>
              <button onClick={copySecret} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1">
                {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Enter 6-Digit Code from App</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Confirm & Enable 2FA
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
