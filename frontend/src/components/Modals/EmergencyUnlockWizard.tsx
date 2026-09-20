import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { SecretNote } from '../../types';
import { unlockSecretNoteAction, fetchSecretNotes } from '../../store/slices/secretNotesSlice';
import { showToast } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import {
  ShieldAlert,
  KeyRound,
  FileWarning,
  Lock,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface Props {
  note: SecretNote;
  onClose: () => void;
}

export const EmergencyUnlockWizard: React.FC<Props> = ({ note, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userPassword, setUserPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [notePassword, setNotePassword] = useState('');
  const [reason, setReason] = useState('');
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = note.ownerId === user?.id;

  const handleValidateStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/secret-notes/step1', {
        noteId: note.id,
        userPassword,
        totpCode: user?.totpEnabled ? totpCode : undefined,
      });
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Step 1 validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/secret-notes/step2', {
        noteId: note.id,
        notePassword,
      });

      if (isOwner) {
        await handleFinalUnlock();
      } else {
        setStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect note-specific password');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await dispatch(
        unlockSecretNoteAction({
          noteId: note.id,
          userPassword,
          totpCode: user?.totpEnabled ? totpCode : undefined,
          notePassword,
          reason,
          acknowledgedWarning: isOwner ? true : acknowledgedWarning,
        })
      ).unwrap();

      dispatch(showToast({ message: `Secret note "${result.title}" unlocked successfully!`, type: 'success' }));
      dispatch(fetchSecretNotes());
      onClose();
    } catch (err: any) {
      const errorMsg = err.data?.error || err.message || 'Emergency unlock condition not satisfied';
      setError(errorMsg);
      dispatch(fetchSecretNotes());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto">
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-indigo-700 dark:from-red-950/80 dark:via-slate-900 dark:to-indigo-950/80 p-4 sm:p-6 border-b border-red-500/30 dark:border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white/20 dark:bg-red-500/20 text-white dark:text-red-400 border border-white/30 dark:border-red-500/30 shrink-0">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-100 dark:text-red-400 block truncate">
                {isOwner ? 'Owner Direct Decryption' : '3-Step Emergency Access Protocol'}
              </span>
              <h3 className="font-extrabold text-base sm:text-xl text-white truncate max-w-xs sm:max-w-sm">{note.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isOwner && (
          <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-semibold bg-slate-50 dark:bg-slate-950/50 shrink-0">
            <div className={`p-2.5 sm:p-3 text-center border-r border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1 ${step === 1 ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-b-2 border-b-blue-500' : step > 1 ? 'text-emerald-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>1.</span>} <span className="truncate">2FA Re-auth</span>
            </div>
            <div className={`p-2.5 sm:p-3 text-center border-r border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1 ${step === 2 ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-b-2 border-b-blue-500' : step > 2 ? 'text-emerald-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {step > 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>2.</span>} <span className="truncate">Note Password</span>
            </div>
            <div className={`p-2.5 sm:p-3 text-center flex items-center justify-center gap-1 ${step === 3 ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-b-2 border-b-blue-500' : 'text-slate-400 dark:text-slate-500'}`}>
              <span>3.</span> <span className="truncate">Emergency</span>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 sm:p-4 rounded-2xl text-xs leading-relaxed mb-4 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleValidateStep1} className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white block mb-1">Step 1 of 3: Identity & Second Factor Verification</strong>
                Please re-authenticate with your primary vault password{user?.totpEnabled ? ' and your 2FA authenticator code' : ''}.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Your Account Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter account password..."
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {user?.totpEnabled && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">2FA Authenticator Code</label>
                  <input
                    type="text"
                    required
                    placeholder="6-digit TOTP code"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono tracking-widest text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !userPassword}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {isOwner ? 'Verify & Continue' : 'Validate Step 1'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleValidateStep2} className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white block mb-1">Step 2: Enter Note-Specific Dedicated Password</strong>
                This note was encrypted with a separate passphrase set exclusively at creation time.
                {note.hint && <p className="mt-1 text-blue-600 dark:text-blue-300 italic font-semibold">Password Hint: "{note.hint}"</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Dedicated Note Password</label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Enter note-specific password..."
                    value={notePassword}
                    onChange={(e) => setNotePassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !notePassword}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {isOwner ? 'Decrypt Note' : 'Validate Step 2'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleFinalUnlock} className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                  <FileWarning className="w-4 h-4" />
                  <span>Step 3: Emergency Eligibility & Waiting-Period Verification</span>
                </div>
                <p>
                  Owner Last Checked In: <strong className="text-slate-900 dark:text-white">{new Date(note.ownerLastCheckInAt).toLocaleString()}</strong> ({note.hoursSinceOwnerCheckIn}h ago).
                  Configured waiting period is <strong className="text-slate-900 dark:text-white">{note.waitingPeriodHours} hours</strong>.
                </p>
                <p>
                  Initiating this request immediately notifies the owner across all active sessions with a red siren alert and records an immutable audit log entry.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Emergency Justification (Why is immediate access required?)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide detailed explanation (e.g. owner unreachable > 48h for urgent legal/business matters)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ack"
                  checked={acknowledgedWarning}
                  onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                  className="mt-1 rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="ack" className="text-xs text-slate-700 dark:text-slate-300 leading-tight cursor-pointer">
                  I solemnly declare under company covenant that this access is requested for genuine emergency or estate succession purposes.
                </label>
              </div>

              <div className="pt-2 flex justify-between">
                <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason || !acknowledgedWarning || reason.trim().length < 10}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-red-600/30 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  Submit Emergency Verification
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
