import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchSecretNotes,
  denyEmergencyRequestAction,
  deleteSecretNoteAction,
  lockNote,
} from '../store/slices/secretNotesSlice';
import { showToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { SecretNote } from '../types';
import {
  ShieldCheck,
  Plus,
  KeyRound,
  Unlock,
  AlertTriangle,
  X,
  Loader2,
  Trash2,
  Search,
  UserCheck,
  Eye,
  EyeOff,
  Shield,
  FileKey,
  Clock,
  HelpCircle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  AttachmentUploader,
  AttachmentViewer,
  parseSecretNotePayload,
} from '../components/SecretNotes/SecretNoteAttachments';
import { NoteAttachment } from '../types';


const PRESET_SECURITY_QUESTIONS = [
  'What is our private joint venture emergency passcode?',
  'What is our company secret registration codeword?',
  'What is the secret safe combination / key location?',
  'What is the name of our first project milestone?',
  'Custom security recovery question...',
];

interface QuestionConfig {
  id: number;
  preset: string;
  customText: string;
  answer: string;
}

const DEFAULT_QUESTIONS: QuestionConfig[] = [
  { id: 1, preset: PRESET_SECURITY_QUESTIONS[0], customText: '', answer: '' },
  { id: 2, preset: PRESET_SECURITY_QUESTIONS[1], customText: '', answer: '' },
  { id: 3, preset: PRESET_SECURITY_QUESTIONS[2], customText: '', answer: '' },
];

export const MySecretNotesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notes, unlockedNoteContent, isLoading } = useSelector((state: RootState) => state.secretNotes);
  const user = useSelector((state: RootState) => state.auth.user);
  const partnerStatus = useSelector((state: RootState) => state.auth.partnerStatus);

  // User & Partner Role calculation (strict AD <-> NS relationship)
  const currentRole = (user?.role || 'AD').toUpperCase() === 'NS' ? 'NS' : 'AD';
  const partnerRole = currentRole === 'AD' ? 'NS' : 'AD';
  const partnerDisplayName = partnerStatus?.partner?.name || `Partner ${partnerRole}`;
  const partnerEmail = partnerStatus?.partner?.email || `${partnerRole.toLowerCase()}@looser.vault`;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'PRIVATE_EMERGENCY' | 'POST_DEATH'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Decrypt Modal State
  const [decryptingNote, setDecryptingNote] = useState<SecretNote | null>(null);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password / Recovery State inside Decrypt Modal
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Array<{ id: number; question: string }>>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number>(1);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [recoveredPasswordResult, setRecoveredPasswordResult] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState('');

  // Create Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'PRIVATE_EMERGENCY' | 'POST_DEATH'>('PRIVATE_EMERGENCY');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [notePassword, setNotePassword] = useState('');
  const [hint, setHint] = useState('');
  const [questions, setQuestions] = useState<QuestionConfig[]>(DEFAULT_QUESTIONS);
  const [waitingPeriodHours, setWaitingPeriodHours] = useState('48');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSecretNotes());
  }, [dispatch]);

  // Filter only notes authored by CURRENT logged in user (My Secret Notes)
  const myNotes = notes.filter((n) => n.ownerId === user?.id);

  const filteredNotes = myNotes.filter((n) => {
    const matchesCategory = activeCategory === 'ALL' || n.category === activeCategory;
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.hint && n.hint.toLowerCase().includes(search.toLowerCase())) ||
      (n.recoveryQuestion && n.recoveryQuestion.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleOpenCreateModal = (cat?: 'PRIVATE_EMERGENCY' | 'POST_DEATH') => {
    setCategory(cat || 'PRIVATE_EMERGENCY');
    setTitle('');
    setContent('');
    setAttachments([]);
    setNotePassword('');
    setHint('');
    setQuestions([
      { id: 1, preset: PRESET_SECURITY_QUESTIONS[0], customText: '', answer: '' },
      { id: 2, preset: PRESET_SECURITY_QUESTIONS[1], customText: '', answer: '' },
      { id: 3, preset: PRESET_SECURITY_QUESTIONS[2], customText: '', answer: '' },
    ]);
    setWaitingPeriodHours(cat === 'POST_DEATH' ? '72' : '48');
    setIsCreateModalOpen(true);
  };

  const handleUpdateQuestion = (index: number, field: keyof QuestionConfig, val: any) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notePassword || notePassword.length < 4) {
      dispatch(showToast({ message: 'Please enter a note password (min 4 characters)', type: 'error' }));
      return;
    }

    // Build recovery questions payload
    const formattedQuestions = questions
      .map((q, idx) => {
        const questionText =
          q.preset === 'Custom security recovery question...' ? q.customText.trim() : q.preset.trim();
        return {
          id: q.id || idx + 1,
          question: questionText,
          answer: q.answer.trim(),
        };
      })
      .filter((q) => q.question.length > 0 && q.answer.length > 0);

    if (formattedQuestions.length === 0) {
      dispatch(
        showToast({
          message: 'Please fill in at least 1 security question & answer for password recovery protection',
          type: 'warning',
        })
      );
      return;
    }

    // Prepare encrypted payload (text + attached images & documents)
    const payloadString =
      attachments.length > 0
        ? JSON.stringify({ text: content, attachments })
        : content;

    try {
      setIsSubmitting(true);
      await api.post('/secret-notes', {
        title: title.trim(),
        category,
        content: payloadString,
        notePassword,
        hint: hint.trim() || undefined,
        designatedRecipientId: partnerStatus?.partner?.id || undefined,
        waitingPeriodHours: parseInt(waitingPeriodHours, 10) || 48,
        recoveryQuestions: formattedQuestions,
        recoveryQuestion: formattedQuestions[0]?.question,
        recoveryAnswer: formattedQuestions[0]?.answer,
      });

      dispatch(
        showToast({
          message: `Secret note created & protected with ${formattedQuestions.length} recovery questions!`,
          type: 'success',
        })
      );
      setIsCreateModalOpen(false);
      dispatch(fetchSecretNotes());
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to create secret note', type: 'error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDecryptModal = async (note: SecretNote) => {
    setDecryptingNote(note);
    setDecryptPassword('');
    setDecryptError('');
    setIsRecoveryMode(false);
    setRecoveryAnswerInput('');
    setNewPasswordInput('');
    setRecoveredPasswordResult('');
    setRecoverySuccessMessage('');

    // Fetch recovery questions metadata
    try {
      const res = await api.get(`/secret-notes/${note.id}/recovery-question`);
      let list: Array<{ id: number; question: string }> = [];
      if (Array.isArray(res.recoveryQuestionsList) && res.recoveryQuestionsList.length > 0) {
        list = res.recoveryQuestionsList;
      } else if (res.recoveryQuestion) {
        list = [{ id: 1, question: res.recoveryQuestion }];
      } else if (note.recoveryQuestion) {
        list = [{ id: 1, question: note.recoveryQuestion }];
      }
      setAvailableQuestions(list);
      if (list.length > 0) {
        setSelectedQuestionId(list[0].id);
      }
    } catch (err) {
      if (note.recoveryQuestion) {
        setAvailableQuestions([{ id: 1, question: note.recoveryQuestion }]);
        setSelectedQuestionId(1);
      } else {
        setAvailableQuestions([]);
      }
    }
  };

  const handleDecryptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decryptingNote || !decryptPassword.trim()) return;

    try {
      setIsDecrypting(true);
      setDecryptError('');

      const res = await api.post('/secret-notes/unlock', {
        noteId: decryptingNote.id,
        userPassword: decryptPassword, // Owner check
        notePassword: decryptPassword,
      });

      // Update Redux state with decrypted content
      dispatch({
        type: 'secretNotes/unlockNoteSuccess',
        payload: {
          noteId: decryptingNote.id,
          content: res.content,
          unlockedAt: res.unlockedAt || new Date().toISOString(),
        },
      });

      dispatch(showToast({ message: 'Note decrypted successfully!', type: 'success' }));
      setDecryptingNote(null);
      setDecryptPassword('');
    } catch (err: any) {
      setDecryptError(err.message || 'Incorrect password to decrypt this note');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decryptingNote || !recoveryAnswerInput.trim()) return;

    try {
      setIsRecovering(true);
      setDecryptError('');
      setRecoverySuccessMessage('');

      const res = await api.post(`/secret-notes/${decryptingNote.id}/recover-password`, {
        questionId: selectedQuestionId,
        recoveryAnswer: recoveryAnswerInput.trim(),
        newPassword: newPasswordInput.trim() || undefined,
      });

      if (res.newPasswordSet) {
        setRecoverySuccessMessage('Password reset successfully! You can now decrypt using your new password.');
        setDecryptPassword(newPasswordInput.trim());
        setIsRecoveryMode(false);
        dispatch(showToast({ message: 'Password reset successfully!', type: 'success' }));
      } else {
        setRecoveredPasswordResult(res.recoveredPassword || '');
        if (res.content) {
          dispatch({
            type: 'secretNotes/unlockNoteSuccess',
            payload: {
              noteId: decryptingNote.id,
              content: res.content,
              unlockedAt: new Date().toISOString(),
            },
          });
        }
        dispatch(
          showToast({
            message: `Question verified! Password recovered successfully.`,
            type: 'success',
          })
        );
      }
    } catch (err: any) {
      setDecryptError(err.message || 'Incorrect security answer. Please try another question or check spelling.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleDenyRequest = async (noteId: string) => {
    const reason = prompt(
      'Reason for denying emergency access request (will be logged in audit trail):',
      'Active and reachable. Access denied.'
    );
    if (reason !== null) {
      await dispatch(denyEmergencyRequestAction({ noteId, reviewNotes: reason }));
      dispatch(showToast({ message: 'Emergency access request denied. Check-in refreshed!', type: 'warning' }));
      dispatch(fetchSecretNotes());
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this secret note and its encryption payload? This cannot be undone.')) {
      await dispatch(deleteSecretNoteAction(id));
      dispatch(showToast({ message: 'Secret note permanently deleted', type: 'info' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileKey className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>My Secret Notes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Encrypted instructions, recovery keys, and directives authored by <strong>{user?.name || currentRole} ({currentRole})</strong> for <strong>Partner {partnerRole}</strong>.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Secret Note for Partner {partnerRole}</span>
        </button>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search notes, hints, recovery questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Notes', count: myNotes.length },
            {
              id: 'PRIVATE_EMERGENCY',
              label: '1. Private & Emergency',
              count: myNotes.filter((n) => n.category === 'PRIVATE_EMERGENCY').length,
            },
            {
              id: 'POST_DEATH',
              label: '2. After Death Directives',
              count: myNotes.filter((n) => n.category === 'POST_DEATH').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <FileKey className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Secret Notes Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create an encrypted directive, succession keys, or emergency instructions for Partner {partnerRole}.
          </p>
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Note for Partner {partnerRole}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredNotes.map((note) => {
            const decrypted = unlockedNoteContent[note.id];
            const pendingRequest =
              note.latestEmergencyRequest?.status === 'PENDING' ? note.latestEmergencyRequest : null;

            return (
              <div
                key={note.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-xl flex flex-col justify-between transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            note.category === 'PRIVATE_EMERGENCY'
                              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                              : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                          }`}
                        >
                          {note.category === 'PRIVATE_EMERGENCY' ? 'Emergency Note' : 'Post-Death Directive'}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                          Authored by You ({currentRole})
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                        {note.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                      title="Permanently Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Recipient & Security Rules Metadata */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-indigo-500" />
                        <span>Designated Partner:</span>
                      </span>
                      <strong className="text-slate-900 dark:text-slate-200">
                        {note.designatedRecipient.name} ({partnerRole})
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Waiting Period:</span>
                      </span>
                      <strong className="text-slate-900 dark:text-slate-200 font-mono">
                        {note.waitingPeriodHours} hours
                      </strong>
                    </div>

                    {/* Recovery Questions Info */}
                    {(note.recoveryQuestionsList && note.recoveryQuestionsList.length > 0) || note.recoveryQuestion ? (
                      <div className="flex items-start justify-between text-slate-600 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 gap-2">
                        <span className="flex items-center gap-1 shrink-0 text-indigo-600 dark:text-indigo-400 font-medium">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Recovery Q&A:</span>
                        </span>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <Sparkles className="w-3 h-3" />
                            <span>
                              {note.recoveryQuestionsList?.length || 1} Security Qs (Any 1 unlocks)
                            </span>
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Pending Emergency Access Alert from Partner */}
                  {pendingRequest && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          <span>Partner Emergency Request Pending</span>
                        </span>
                        <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded">
                          Release: {new Date(pendingRequest.eligibleReleaseDate).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                        Reason given: "{pendingRequest.reason}"
                      </p>
                      <button
                        onClick={() => handleDenyRequest(note.id)}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow"
                      >
                        Deny / Cancel Partner Request (I am Active)
                      </button>
                    </div>
                  )}

                  {/* Decrypted Content View */}
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
                            Hide & Lock
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
                            isOwner={true}
                            noteTitle={note.title}
                          />
                        ) : null}
                      </div>
                    );
                  })() : null}
                </div>

                {/* Footer Controls */}
                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Encrypted AES-256</span>
                  </div>

                  {!decrypted && (
                    <button
                      onClick={() => handleOpenDecryptModal(note)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>View My Note Content</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decrypt & Forgot Password Modal */}
      {decryptingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isRecoveryMode ? '3-Question Recovery Protection' : 'Decrypt Secret Note'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[230px]">"{decryptingNote.title}"</p>
                </div>
              </div>
              <button
                onClick={() => setDecryptingNote(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Toggle: Standard Password vs Forgot Password / Security Q&A */}
            {!isRecoveryMode ? (
              <form onSubmit={handleDecryptSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Enter Dedicated Note Password
                    </label>
                    {availableQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecoveryMode(true);
                          setDecryptError('');
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Forgot Password? ({availableQuestions.length} Qs)</span>
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      value={decryptPassword}
                      onChange={(e) => setDecryptPassword(e.target.value)}
                      placeholder="Enter password..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {decryptError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{decryptError}</span>
                  </div>
                )}

                {recoverySuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{recoverySuccessMessage}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDecryptingNote(null)}
                    className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDecrypting || !decryptPassword.trim()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    {isDecrypting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Decrypting...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock & Reveal</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Security Q&A 3-Question Recovery Form (Any 1 of 3 unlocks) */
              <form onSubmit={handleRecoverySubmit} className="space-y-4 animate-fade-in">
                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Security Recovery Protocol</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      1 of {availableQuestions.length} Correct Unlocks
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Select <strong>any ONE</strong> of your configured questions below and enter its correct answer to recover your password.
                  </p>
                </div>

                {/* Available Questions Radio Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Choose Which Question to Answer:
                  </label>
                  <div className="space-y-1.5">
                    {availableQuestions.map((q, idx) => (
                      <label
                        key={q.id || idx}
                        onClick={() => setSelectedQuestionId(q.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          selectedQuestionId === q.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 font-semibold text-indigo-950 dark:text-indigo-200 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="recoveryQuestionChoice"
                          checked={selectedQuestionId === q.id}
                          onChange={() => setSelectedQuestionId(q.id)}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                            Question {idx + 1}
                          </span>
                          <span className="leading-snug">"{q.question}"</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Secret Answer for Selected Question
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={recoveryAnswerInput}
                    onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                    placeholder="Enter confidential answer..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Set New Password (Optional - leave blank to only reveal password)
                  </label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password (min 4 characters)..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                {recoveredPasswordResult && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5 animate-fade-in">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Recovered Note Password:</span>
                    </span>
                    <div className="font-mono text-sm bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 select-all font-bold text-emerald-900 dark:text-emerald-100">
                      {recoveredPasswordResult}
                    </div>
                  </div>
                )}

                {decryptError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{decryptError}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryMode(false);
                      setDecryptError('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <span>← Back to Password</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDecryptingNote(null)}
                      className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isRecovering || !recoveryAnswerInput.trim()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      {isRecovering ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Answer...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{newPasswordInput.trim() ? 'Reset Password' : 'Verify & Unlock'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Note Modal with 3 Recovery Questions (Wide & Beautiful Layout) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col my-auto transition-all">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-50 dark:ring-indigo-950/50">
                  <FileKey className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                      Create Secret Note for Partner {partnerRole}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wide">
                      {currentRole} ➔ {partnerRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    AES-256-GCM encrypted directives protected with 3 recovery questions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNote} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Core Note Attributes */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Note Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Note Title</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Required</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Master Vault Keys & Cold Storage"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                    />
                  </div>

                  {/* Section / Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Section / Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                    >
                      <option value="PRIVATE_EMERGENCY">1. Private and Emergency Notes</option>
                      <option value="POST_DEATH">2. Instructions to Follow After My Death</option>
                    </select>
                  </div>

                  {/* Designated Partner Recipient Card */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Designated Partner Recipient
                    </label>
                    <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-slate-950 dark:to-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-md shadow-indigo-600/30">
                          {partnerRole}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {partnerDisplayName} ({partnerRole})
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {partnerEmail}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                        Strict Pair
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Note Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Dedicated Note Password</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Min 4 chars</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        required
                        value={notePassword}
                        onChange={(e) => setNotePassword(e.target.value)}
                        placeholder="Enter separate encryption password..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl pl-4 pr-10 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Hint */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Password Hint (Optional)
                    </label>
                    <input
                      type="text"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="e.g. In the blue envelope in office drawer"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>

                  {/* Inactivity Waiting Period */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                      <span>Waiting Period Before Release</span>
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60">
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
                          className={`py-2 px-2.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
                            waitingPeriodHours === item.value
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: 3 Security Questions & Answers (Forgot Password Protection) */}
                <div className="lg:col-span-7 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 rounded-3xl p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Forgot Password Protection (3 Questions)
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Any 1 Unlocks
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      Configure 3 recovery questions. If you ever forget your note password, answering <strong>any ONE of the 3 questions</strong> correctly will immediately recover or reset your password.
                    </p>

                    {/* Question Cards */}
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-3.5 space-y-2.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-extrabold">
                                {idx + 1}
                              </span>
                              <span>Security Question #{idx + 1}</span>
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                              {idx === 0 ? 'Primary (Required)' : `Backup ${idx}`}
                            </span>
                          </div>

                          <div>
                            <select
                              value={q.preset}
                              onChange={(e) => handleUpdateQuestion(idx, 'preset', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            >
                              {PRESET_SECURITY_QUESTIONS.map((presetOpt) => (
                                <option key={presetOpt} value={presetOpt}>
                                  {presetOpt}
                                </option>
                              ))}
                            </select>
                          </div>

                          {q.preset === 'Custom security recovery question...' && (
                            <div>
                              <input
                                type="text"
                                required={idx === 0 || q.answer.length > 0}
                                value={q.customText}
                                onChange={(e) => handleUpdateQuestion(idx, 'customText', e.target.value)}
                                placeholder={`Type custom security question #${idx + 1}...`}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                              />
                            </div>
                          )}

                          <div>
                            <input
                              type="text"
                              required={idx === 0}
                              value={q.answer}
                              onChange={(e) => handleUpdateQuestion(idx, 'answer', e.target.value)}
                              placeholder={`Confidential answer for Question #${idx + 1}...`}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidential Image & Document Uploads */}
              <AttachmentUploader
                attachments={attachments}
                onChange={setAttachments}
                maxFileSizeMb={10}
              />

              {/* Full-Width Section: Secret Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Confidential Secret Content</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {content.length} characters
                  </span>
                </label>
                <textarea
                  rows={4}
                  required={attachments.length === 0}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter sensitive directives, recovery phrases, bank details, escrow passwords, emergency instructions..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl p-4 font-mono text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-inner leading-relaxed"
                />
              </div>

              {/* Action Buttons & Security Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Encrypted on your device before transmission (AES-256-GCM)</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Encrypting & Saving...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Encrypt & Save for Partner {partnerRole}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
