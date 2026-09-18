import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchSecretNotes,
  createSecretNoteAction,
  denyEmergencyRequestAction,
  verifyPostDeathAction,
  deleteSecretNoteAction,
  lockNote,
} from '../store/slices/secretNotesSlice';
import { showToast } from '../store/slices/uiSlice';
import { fetchPartnerStatus } from '../store/slices/authSlice';
import { api } from '../services/api';
import { sirenAudio } from '../services/sirenAudio';
import { SecretNote } from '../types';
import { EmergencyUnlockWizard } from '../components/Modals/EmergencyUnlockWizard';
import {
  AttachmentUploader,
  AttachmentViewer,
  parseSecretNotePayload,
} from '../components/SecretNotes/SecretNoteAttachments';
import { NoteAttachment } from '../types';
import {
  ShieldAlert,
  Flame,
  Plus,
  KeyRound,
  Unlock,
  AlertTriangle,
  X,
  Loader2,
  Trash2,
  HelpCircle,
  BookOpen,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Volume2,
  Delete,
  ArrowRight,
  HeartHandshake,
  Radio,
  UserCheck,
  Laptop,
  Globe,
  Clock,
  StickyNote,
} from 'lucide-react';

export const SecretNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { notes, unlockedNoteContent, isLoading } = useSelector((state: RootState) => state.secretNotes);
  const user = useSelector((state: RootState) => state.auth.user);
  const partnerStatus = useSelector((state: RootState) => state.auth.partnerStatus);

  // Dynamic Partner Name: If NS is logged in -> "Adarsh", if AD is logged in -> "NS" / Partner name
  const partnerName = user?.role === 'NS' ? 'Adarsh' : (partnerStatus?.partner?.name || 'NS');

  // Multi-step Emergency Protocol Overlay State
  const [isPageUnlocked, setIsPageUnlocked] = useState(false);
  const [protocolStep, setProtocolStep] = useState<'CHECK_INACTIVITY' | 'TRUST_PLEDGE' | 'PASSWORD_AUTH'>('CHECK_INACTIVITY');
  const [humanVerified, setHumanVerified] = useState(false);
  const [pledgeChecked, setPledgeChecked] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [isModalBlinking, setIsModalBlinking] = useState(true);
  const [isCheatBlockedModalOpen, setIsCheatBlockedModalOpen] = useState(false);

  // Initial slow emergency blink on opening Secret Notes (2 seconds)
  useEffect(() => {
    setIsModalBlinking(true);
    const timer = setTimeout(() => {
      setIsModalBlinking(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Password & Verification State
  const [vaultPasswordInput, setVaultPasswordInput] = useState('');
  const [showVaultPassword, setShowVaultPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [isVerifyingUnlock, setIsVerifyingUnlock] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'PRIVATE_EMERGENCY' | 'POST_DEATH'>('PRIVATE_EMERGENCY');
  const [selectedNoteForUnlock, setSelectedNoteForUnlock] = useState<SecretNote | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'PRIVATE_EMERGENCY' | 'POST_DEATH'>('PRIVATE_EMERGENCY');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [notePassword, setNotePassword] = useState('');
  const [hint, setHint] = useState('');
  const [waitingPeriodHours, setWaitingPeriodHours] = useState('48');

  useEffect(() => {
    dispatch(fetchSecretNotes());
    dispatch(fetchPartnerStatus());
  }, [dispatch]);

  const handleStep1Proceed = () => {
    const hoursSinceActive = partnerStatus?.hoursSinceCheckIn ?? 0;
    const isPartnerAliveAndActive = partnerStatus?.isAliveAndActive ?? (hoursSinceActive < 48);

    if (isPartnerAliveAndActive) {
      // PARTNER IS ALIVE! Partner logged into website within the last 2 days (< 48 hours)
      // Trigger loud oscillating emergency siren alarm:
      setIsSirenActive(true);
      sirenAudio.playSiren(25); // Loud continuous emergency siren
      setIsCheatBlockedModalOpen(true);

      // Log audit event to backend
      api.post('/audit-logs/log-event', {
        eventType: 'EMERGENCY_ACCESS_CHEAT_BLOCKED',
        severity: 'CRITICAL',
        alertMessage: `🚨 SIREN ALERT: Partner ${user?.name || user?.role} attempted unauthorized entry into Emergency Secret Notes claiming ${partnerName} is missing, but ${partnerName} is ALIVE and logged in ${hoursSinceActive}h ago (IP: ${partnerStatus?.latestActivity?.ipAddress || '127.0.0.1'}). Access blocked!`,
        metadata: {
          partnerName,
          hoursSinceActive,
          minutesSinceActive: partnerStatus?.minutesSinceCheckIn,
          ipAddress: partnerStatus?.latestActivity?.ipAddress,
          deviceInfo: partnerStatus?.latestActivity?.deviceInfo,
          lastLogin: partnerStatus?.latestActivity?.createdAt,
        },
      }).catch(() => {});
      return;
    }

    // Legitimate emergency: partner has had NO contact for > 2 full days (> 48h)
    sirenAudio.playEmergencyBeep(1.2);
    setIsSirenActive(true);
    setTimeout(() => setIsSirenActive(false), 1200);
    setProtocolStep('TRUST_PLEDGE');
  };

  useEffect(() => {
    if (!isPageUnlocked && protocolStep === 'PASSWORD_AUTH') {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isPageUnlocked, protocolStep]);

  // Clean up siren on unmount or unlock
  useEffect(() => {
    return () => {
      sirenAudio.stop();
    };
  }, []);

  // Web Audio Synthesizer Beep on Every Keypress / Digit
  const playKeyBeep = (freq = 880) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Ignore browser autoplay restrictions
    }
  };

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.22);
      }, 100);
    } catch (e) {}
  };

  const playErrorBuzzer = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  };

  const triggerLoudSiren = (seconds = 5) => {
    setIsSirenActive(true);
    sirenAudio.playSiren(seconds);
    setTimeout(() => {
      setIsSirenActive(false);
    }, seconds * 1000);
  };

  const handlePasswordChange = (val: string) => {
    if (val.length > vaultPasswordInput.length) {
      playKeyBeep(880 + (val.length % 5) * 40);
    } else if (val.length < vaultPasswordInput.length) {
      playKeyBeep(620);
    }
    setVaultPasswordInput(val);
    if (unlockError) setUnlockError('');
  };

  const handleKeypadPress = (digit: string) => {
    playKeyBeep(880 + (parseInt(digit, 10) || 0) * 35);
    setVaultPasswordInput((prev) => prev + digit);
    if (unlockError) setUnlockError('');
    passwordInputRef.current?.focus();
  };

  const handleKeypadBackspace = () => {
    playKeyBeep(520);
    setVaultPasswordInput((prev) => prev.slice(0, -1));
    if (unlockError) setUnlockError('');
    passwordInputRef.current?.focus();
  };

  const handleKeypadClear = () => {
    playKeyBeep(440);
    setVaultPasswordInput('');
    if (unlockError) setUnlockError('');
    passwordInputRef.current?.focus();
  };

  const handleUnlockVault = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vaultPasswordInput.trim()) {
      setUnlockError('Please enter security password');
      playErrorBuzzer();
      return;
    }

    try {
      setIsVerifyingUnlock(true);
      setUnlockError('');

      // Trigger loud alert siren to mark password submission attempt
      triggerLoudSiren(3);

      // Verify credentials against /api/auth/reauth
      const res = await api.post('/auth/reauth', { password: vaultPasswordInput.trim() });
      if (res?.reauthToken) {
        sessionStorage.setItem('looser_reauth_token', res.reauthToken);
      }

      sirenAudio.stop();
      setIsSirenActive(false);
      playSuccessChime();
      setIsPageUnlocked(true);
      setVaultPasswordInput('');
      dispatch(showToast({ message: 'Emergency Secret Vault Access Granted', type: 'success' }));
    } catch (err: any) {
      playErrorBuzzer();
      setUnlockError(err.message || 'Incorrect security password. Emergency access denied.');
    } finally {
      setIsVerifyingUnlock(false);
    }
  };

  const handleRelockVault = () => {
    sirenAudio.stop();
    setIsSirenActive(false);
    setIsPageUnlocked(false);
    setProtocolStep('CHECK_INACTIVITY');
    setPledgeChecked(false);
    setHumanVerified(false);
    setVaultPasswordInput('');
    setUnlockError('');
    setIsModalBlinking(true);
    setTimeout(() => setIsModalBlinking(false), 2000);
  };

  const filteredNotes = notes.filter((n) => n.category === activeTab);

  const handleOpenCreateModal = (cat: 'PRIVATE_EMERGENCY' | 'POST_DEATH') => {
    setCategory(cat);
    setTitle('');
    setContent('');
    setAttachments([]);
    setNotePassword('');
    setHint('');
    setWaitingPeriodHours(cat === 'POST_DEATH' ? '72' : '48');
    setIsCreateModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerStatus?.partner) {
      dispatch(showToast({ message: 'Partner account not found', type: 'error' }));
      return;
    }

    const payloadString =
      attachments.length > 0
        ? JSON.stringify({ text: content, attachments })
        : content;

    try {
      await dispatch(
        createSecretNoteAction({
          title,
          category,
          content: payloadString,
          notePassword,
          hint: hint || undefined,
          designatedRecipientId: partnerStatus.partner.id,
          waitingPeriodHours: parseInt(waitingPeriodHours, 10),
        })
      ).unwrap();

      dispatch(showToast({ message: 'Secret note created with dedicated encryption key!', type: 'success' }));
      setIsCreateModalOpen(false);
      dispatch(fetchSecretNotes());
    } catch (err) {
      dispatch(showToast({ message: 'Failed to create secret note', type: 'error' }));
    }
  };

  const handleDenyRequest = async (noteId: string) => {
    const reason = prompt('Reason for denying emergency access request (will be logged):', 'Active and reachable. Access denied.');
    if (reason !== null) {
      await dispatch(denyEmergencyRequestAction({ noteId, reviewNotes: reason }));
      dispatch(showToast({ message: 'Emergency access request denied and owner check-in refreshed!', type: 'warning' }));
      dispatch(fetchSecretNotes());
    }
  };

  const handleVerifyPostDeathProtocol = async (noteId: string) => {
    const notesRes = prompt('Enter official legal/trustee death verification document identifier:');
    if (notesRes) {
      await dispatch(verifyPostDeathAction({ noteId, verificationNotes: notesRes }));
      dispatch(showToast({ message: 'Post-death protocol verified. Note is now unlocked.', type: 'success' }));
      dispatch(fetchSecretNotes());
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this secret note and its encryption payload?')) {
      await dispatch(deleteSecretNoteAction(id));
      dispatch(showToast({ message: 'Secret note deleted', type: 'info' }));
    }
  };

  return (
    <div className="relative min-h-[80vh]">
      {/* Blurred / Clear Background Container */}
      <div
        className={`space-y-6 transition-all duration-700 ${
          !isPageUnlocked
            ? 'filter blur-3xl opacity-0 select-none pointer-events-none'
            : 'filter-none opacity-100'
        }`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-500" />
              <span>Secret Notes & Emergency Protocol</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Protected by separate passwords, 3-step validation, owner check-ins, and live siren alerts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRelockVault}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Lock this vault page"
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              <span>Lock Vault</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal(activeTab)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Secret Note</span>
            </button>
          </div>
        </div>

        {/* Two Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('PRIVATE_EMERGENCY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'PRIVATE_EMERGENCY'
                ? 'bg-red-50 dark:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>1. Private & Emergency Notes</span>
          </button>

          <button
            onClick={() => setActiveTab('POST_DEATH')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'POST_DEATH'
                ? 'bg-purple-50 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>2. Instructions to Follow After My Death</span>
          </button>
        </div>

        {/* Protocol Explainer Banner */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-2 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span>
              {activeTab === 'PRIVATE_EMERGENCY'
                ? 'Emergency Access Protocol (Owner Unreachable > 48h)'
                : 'Post-Death Directives & Estate Protocol'}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {activeTab === 'PRIVATE_EMERGENCY'
              ? 'Emergency notes require the recipient to complete 3 validation steps: (1) Re-authenticate + 2FA, (2) Enter note-specific password, and (3) Submit justification while completing the owner inactivity/waiting period check. The owner receives an immediate red siren alert on active sessions.'
              : 'Instructions after death will NOT be automatically released by inactivity alone. They require a distinct verification protocol (e.g. dual trustee sign-off or certificate verification) plus the note’s dedicated password.'}
          </p>
        </div>

        {/* Notes List */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Secret Notes in this Category</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create an emergency directive, cold storage recovery keys, or succession instructions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => {
              const isOwner = note.ownerId === user?.id;
              const decrypted = unlockedNoteContent[note.id];
              const pendingRequest = note.latestEmergencyRequest?.status === 'PENDING' ? note.latestEmergencyRequest : null;

              return (
                <div
                  key={note.id}
                  className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl flex flex-col justify-between transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                            {note.category === 'PRIVATE_EMERGENCY' ? 'Emergency Note' : 'Post-Death Directive'}
                          </span>
                          {isOwner ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                              Your Note
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              Partner's Note
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">{note.title}</h3>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Owner Status & Inactivity indicator */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Owner: <strong className="text-slate-900 dark:text-slate-200">{note.owner.name}</strong></span>
                        <span className="font-mono text-[11px]">
                          Last Check-in: {note.hoursSinceOwnerCheckIn}h ago
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Configured Waiting Period:</span>
                        <strong className="text-slate-900 dark:text-slate-200 font-mono">{note.waitingPeriodHours} hours</strong>
                      </div>
                    </div>

                    {/* Pending Emergency Request Notice */}
                    {pendingRequest && (
                      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            <span>Emergency Access Request Pending</span>
                          </span>
                          <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded">
                            Release: {new Date(pendingRequest.eligibleReleaseDate).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                          Reason: "{pendingRequest.reason}"
                        </p>
                        {isOwner && (
                          <button
                            onClick={() => handleDenyRequest(note.id)}
                            className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow"
                          >
                            Deny / Cancel This Request
                          </button>
                        )}
                      </div>
                    )}

                    {/* Post-death verification banner if applicable */}
                    {note.category === 'POST_DEATH' && (
                      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 text-xs flex items-center justify-between">
                        <span className="text-purple-700 dark:text-purple-300">
                          Protocol Status: <strong>{note.postDeathVerified ? 'Verified by Trustee' : 'Unverified (Requires Proof)'}</strong>
                        </span>
                        {!note.postDeathVerified && !isOwner && (
                          <button
                            onClick={() => handleVerifyPostDeathProtocol(note.id)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-semibold transition"
                          >
                            Submit Proof
                          </button>
                        )}
                      </div>
                    )}

                    {/* Decrypted Content Box */}
                    {decrypted ? (() => {
                      const parsed = parseSecretNotePayload(decrypted.content);
                      return (
                        <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/50 rounded-2xl p-4 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <Unlock className="w-4 h-4" />
                              <span>Decrypted Secret Content</span>
                            </span>
                            <button
                              onClick={() => dispatch(lockNote(note.id))}
                              className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded transition"
                            >
                              Lock Again
                            </button>
                          </div>
                          {parsed.text ? (
                            <div className="font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                              {parsed.text}
                            </div>
                          ) : null}
                          {parsed.attachments && parsed.attachments.length > 0 ? (
                            <AttachmentViewer
                              attachments={parsed.attachments}
                              isOwner={isOwner}
                              noteTitle={note.title}
                            />
                          ) : null}
                        </div>
                      );
                    })() : null}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">
                      Recipient: <strong className="text-slate-700 dark:text-slate-400">{note.designatedRecipient.name}</strong>
                    </div>

                    {!decrypted && (
                      <button
                        onClick={() => setSelectedNoteForUnlock(note)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          isOwner
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isOwner ? 'Unlock (Owner)' : '3-Step Emergency Access'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MULTI-STEP BLURRED EMERGENCY VERIFICATION PROTOCOL OVERLAY */}
      {!isPageUnlocked && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-3xl animate-fade-in overflow-y-auto">
          {/* STEP 1: Inactivity & Missing Confirmation */}
          {protocolStep === 'CHECK_INACTIVITY' && (
            <div
              className={`bg-white/95 dark:bg-slate-900/95 border-2 border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-center backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${
                isModalBlinking ? 'animate-emergency-blink' : 'animate-scale-up'
              }`}
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 dark:bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center text-red-600 dark:text-red-400 shadow-xl shadow-red-500/20 animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-extrabold uppercase tracking-wider border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>Emergency Protocol Verification — Step 1 of 3</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                  Are you sure {partnerName} has had NO CONTACT for the last 2 days and is missing?
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Secret emergency directives are strictly reserved for genuine crises. If {partnerName} has been completely unreachable for <strong>more than 2 full days</strong>, you can proceed inside.
                </p>
              </div>

              <div className="space-y-4 pt-1">
                {/* Confirmation Checkbox */}
                <label className="flex items-center justify-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-red-500/40 rounded-2xl cursor-pointer text-left transition shadow-xs">
                  <input
                    type="checkbox"
                    checked={humanVerified}
                    onChange={(e) => {
                      setHumanVerified(e.target.checked);
                      playKeyBeep(e.target.checked ? 1040 : 440);
                    }}
                    className="w-5 h-5 mt-0.5 rounded text-red-600 focus:ring-red-500 cursor-pointer shrink-0 accent-red-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                      <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>YES, I AM CONFIRM {partnerName.toUpperCase()} IS MISSING</span>
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium uppercase">
                      NO CONTACT FOR LAST 2 DAYS
                    </p>
                  </div>
                </label>

                <button
                  type="button"
                  disabled={!humanVerified}
                  onClick={handleStep1Proceed}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition"
                >
                  <span>Yes, I am Sure — Proceed Inside</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/business')}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
                >
                  Cancel ({partnerName} is alive and in contact)
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Sacred Trust & Moral Pledge / Oath Agreement */}
          {protocolStep === 'TRUST_PLEDGE' && (
            <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-center backdrop-blur-xl relative overflow-hidden animate-scale-up">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xl shadow-amber-500/20">
                  <HeartHandshake className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Sacred Trust & Moral Pledge — Step 2 of 3</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                  I Will Not Cheat — Emergency Integrity Oath
                </h2>
              </div>

              {/* Solemn Warning Card */}
              <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500/30 rounded-2xl p-4 sm:p-5 text-left space-y-3">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>CRITICAL SOLEMN WARNING</span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  <p>
                    <strong className="text-red-600 dark:text-red-400">DO NOT GO INSIDE</strong> if {partnerName} is alive, safe, or in contact!
                  </p>
                  <p>
                    Only access these secret notes if there has been strictly <strong>NO CONTACT for more than 2 full days</strong> and {partnerName} is genuinely missing.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    Accessing these confidential directives without a true emergency will permanently violate and damage your mutual trust and bond.
                  </p>
                </div>
              </div>

              {/* Mandatory Oath Checkbox */}
              <label className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer text-left transition hover:border-amber-500/50">
                <input
                  type="checkbox"
                  checked={pledgeChecked}
                  onChange={(e) => {
                    setPledgeChecked(e.target.checked);
                    playKeyBeep(e.target.checked ? 1040 : 440);
                  }}
                  className="w-5 h-5 mt-0.5 rounded text-red-600 focus:ring-red-500 cursor-pointer shrink-0 accent-red-600"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                  I solemnly swear: {partnerName} has been missing with 0 contact for &gt; 2 days. I am proceeding solely out of true emergency necessity and will not cheat our bond.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  disabled={!pledgeChecked}
                  onClick={() => {
                    setProtocolStep('PASSWORD_AUTH');
                    triggerLoudSiren(4);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition active:scale-[0.98]"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>I Pledge & Proceed to Password Page (🚨 Siren Alert)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProtocolStep('CHECK_INACTIVITY');
                    navigate('/dashboard');
                  }}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-2xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                >
                  ← I Will Not Violate Trust (Exit to Dashboard)
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Password Page with Loud Siren Sound on Click / Keypress */}
          {protocolStep === 'PASSWORD_AUTH' && (
            <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center backdrop-blur-xl relative overflow-hidden animate-scale-up">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Siren Alert Banner */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-red-500" />
                  <span>🚨 EMERGENCY ALARM ACTIVE</span>
                </span>
                <button
                  type="button"
                  onClick={() => (isSirenActive ? sirenAudio.stop() : triggerLoudSiren(4))}
                  className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500 text-white"
                >
                  {isSirenActive ? 'Mute Siren' : 'Test Siren'}
                </button>
              </div>

              {/* Header Lock Icon & Badge */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 dark:bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center text-red-600 dark:text-red-400 shadow-xl shadow-red-500/20 animate-pulse">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow">
                    <Volume2 className="w-3 h-3" />
                  </div>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-extrabold uppercase tracking-wider border border-red-200 dark:border-red-800 mb-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Password Authentication — Step 3 of 3</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Secret Notes Security Lock
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    Enter the master security password created by the owner to unlock and reveal the vault.
                  </p>
                </div>
              </div>

              {/* Password Form with Keystroke Beep Sound */}
              <form onSubmit={handleUnlockVault} className="space-y-4">
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showVaultPassword ? 'text' : 'password'}
                    value={vaultPasswordInput}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter security password..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 focus:border-red-500 dark:focus:border-red-500 rounded-2xl px-4 py-3 text-center text-base font-mono tracking-widest text-slate-900 dark:text-white outline-none shadow-inner transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVaultPassword(!showVaultPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition"
                    title={showVaultPassword ? 'Hide password' : 'Show password'}
                  >
                    {showVaultPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Error Message */}
                {unlockError && (
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{unlockError}</span>
                  </div>
                )}

                {/* Electronic PIN Keypad with Beep Sound */}
                <div className="grid grid-cols-3 gap-2 pt-1 max-w-[280px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-mono font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="py-2.5 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-bold text-[10px] uppercase rounded-xl border border-slate-200 dark:border-slate-700 transition"
                    title="Clear"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-mono font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="py-2.5 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 transition"
                    title="Backspace"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isVerifyingUnlock || !vaultPasswordInput.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition active:scale-[0.99]"
                >
                  {isVerifyingUnlock ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Security Key...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Unlock Secret Vault (🚨 Siren Burst)</span>
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setProtocolStep('TRUST_PLEDGE')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition"
              >
                ← Back to Trust Oath
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unlock Wizard Modal */}
      {selectedNoteForUnlock && (
        <EmergencyUnlockWizard
          note={selectedNoteForUnlock}
          onClose={() => setSelectedNoteForUnlock(null)}
        />
      )}

      {/* Create Note Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create Secret Note</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Encrypted with a separate dedicated password</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Note Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Cold Storage Keys & Swiss Safe"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Section / Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="PRIVATE_EMERGENCY">1. Private and Emergency Notes</option>
                  <option value="POST_DEATH">2. Instructions to Follow After My Death</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Dedicated Note Password (Separate from Account)</label>
                <input
                  type="password"
                  required
                  value={notePassword}
                  onChange={(e) => setNotePassword(e.target.value)}
                  placeholder="Enter strong separate password..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 font-mono text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password Hint (Optional)</label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. Sealed envelope in estate safe"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>Waiting Period Before Release</span>
                  <span className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold">
                    {waitingPeriodHours === '168' ? '7 Days (168h)' : `${waitingPeriodHours} Hours`}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '24h', value: '24' },
                    { label: '48h', value: '48' },
                    { label: '72h', value: '72' },
                    { label: '7 Days', value: '168' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setWaitingPeriodHours(item.value)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                        waitingPeriodHours === item.value
                          ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-red-400 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidential Image & Document Uploads */}
              <AttachmentUploader
                attachments={attachments}
                onChange={setAttachments}
                maxFileSizeMb={10}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Secret Content</label>
                <textarea
                  rows={4}
                  required={attachments.length === 0}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter sensitive directives, recovery codes, escrow instructions..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-600/30 transition"
                >
                  Encrypt & Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚨 CHEAT PREVENTION & PARTNER ALIVE POPUP MODAL (SIREN ACTIVE & REPEATED BLINKING) */}
      {isCheatBlockedModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-3xl animate-fade-in overflow-y-auto select-none">
          <div className="bg-slate-950 border-4 border-red-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_90px_rgba(239,68,68,0.85)] space-y-5 text-center text-white relative overflow-hidden ring-8 ring-red-500/50 animate-pulse my-auto">
            {/* Ambient Red Alert Glow */}
            <div className="absolute -top-24 -left-24 w-52 h-52 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

            {/* Siren Icon with Oscillating Glow */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-red-500/50 animate-bounce ring-4 ring-red-400/40">
                <ShieldAlert className="w-10 h-10 animate-pulse" />
              </div>
              <span className="absolute -top-1 right-28 sm:right-36 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
            </div>

            {/* Headers */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-[11px] font-extrabold uppercase tracking-wider animate-pulse">
                <Volume2 className="w-3.5 h-3.5 text-red-400" />
                <span>SIREN ALARM ACTIVE • ACCESS BLOCKED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {partnerName.toUpperCase()} IS ALIVE!
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-red-200">
                {partnerName} logged into the website within the last 2 days.
              </p>
            </div>

            {/* Activity & Device Telemetry Card */}
            <div className="bg-slate-950/90 rounded-2xl p-4 border border-red-500/30 text-left space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-indigo-400" />
                  <span>Device / Browser:</span>
                </span>
                <strong className="text-slate-100 font-bold">
                  {partnerStatus?.latestActivity?.deviceInfo || 'MacBook / Desktop Browser'}
                </strong>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>IP Address:</span>
                </span>
                <strong className="text-slate-100 font-bold">
                  {partnerStatus?.latestActivity?.ipAddress || '127.0.0.1'}
                </strong>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Last Login Time:</span>
                </span>
                <strong className="text-slate-100 font-bold">
                  {partnerStatus?.latestActivity?.createdAt
                    ? new Date(partnerStatus.latestActivity.createdAt).toLocaleString()
                    : new Date().toLocaleString()}
                </strong>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Inactivity Elapsed:</span>
                </span>
                <span className="text-amber-400 font-extrabold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  Only {partnerStatus?.hoursSinceCheckIn || 0}h {partnerStatus?.minutesSinceCheckIn || 0}m ago
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <span className="text-slate-400">Emergency Threshold:</span>
                <span className="text-rose-400 font-bold">Must be &gt; 48 hours of NO CONTACT</span>
              </div>
            </div>

            {/* Warning Text */}
            <p className="text-xs text-slate-300 leading-relaxed bg-red-950/40 p-3 rounded-xl border border-red-900/50">
              🚨 <strong>Access Prohibited:</strong> Emergency directives are strictly sealed while your partner is alive. Because {partnerName} has been active on this platform in the last 2 days, you cannot go inside. This attempt has been permanently logged.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  sirenAudio.stop();
                  setIsSirenActive(false);
                  setIsCheatBlockedModalOpen(false);
                  navigate('/dashboard');
                }}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-red-600/40 transition active:scale-98 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <span>🚨 Stop Siren Alarm & Exit Vault</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sirenAudio.stop();
                  setIsSirenActive(false);
                  setIsCheatBlockedModalOpen(false);
                  navigate('/reminders-notes');
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <StickyNote className="w-4 h-4 text-amber-400" />
                <span>Send Shared Priority Note to {partnerName}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
