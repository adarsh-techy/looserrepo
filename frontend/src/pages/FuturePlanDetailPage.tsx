import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  updateFuturePlanAction,
  updatePartnerNotesAction,
  deleteFuturePlanAction,
} from '../store/slices/futurePlansSlice';
import { showToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { FuturePlan } from '../types';
import {
  ArrowLeft,
  Compass,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit,
  Clock,
  User,
  X,
  Loader2,
  ListTodo,
  Sparkles,
  MessageSquare,
  Save,
  FileEdit,
  Lock,
  Check,
  Pencil,
} from 'lucide-react';

export const FuturePlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const storePlan = useSelector((state: RootState) =>
    state.futurePlans.plans.find((p) => p.id === id)
  );

  const [plan, setPlan] = useState<FuturePlan | null>(storePlan || null);
  const [loading, setLoading] = useState(!storePlan);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneText, setEditingMilestoneText] = useState('');

  // Partner Note State
  const [adNotesInput, setAdNotesInput] = useState('');
  const [nsNotesInput, setNsNotesInput] = useState('');
  const [sharedNotesInput, setSharedNotesInput] = useState('');
  const [savingAdNotes, setSavingAdNotes] = useState(false);
  const [savingNsNotes, setSavingNsNotes] = useState(false);
  const [savingSharedNotes, setSavingSharedNotes] = useState(false);

  // Active user role (defaults to currentUser.role, normalized to uppercase AD or NS)
  const activeRole = (currentUser?.role || 'AD').toUpperCase() === 'NS' ? 'NS' : 'AD';

  // Edit Form State
  const [title, setTitle] = useState('');
  const [targetQuarter, setTargetQuarter] = useState('Q4 2026');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [status, setStatus] = useState<'IDEA' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [description, setDescription] = useState('');
  const [milestonesInput, setMilestonesInput] = useState('');

  useEffect(() => {
    async function loadPlan() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.get(`/future-plans/${id}`);
        setPlan(res);
        setAdNotesInput(res.adNotes || '');
        setNsNotesInput(res.nsNotes || '');
        setSharedNotesInput(res.sharedNotes || '');
      } catch (err: any) {
        dispatch(showToast({ message: 'Failed to load future plan', type: 'error' }));
        navigate('/future-plans');
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [id, dispatch, navigate]);

  const handleOpenEdit = () => {
    if (!plan) return;
    setTitle(plan.title);
    setTargetQuarter(plan.targetQuarter);
    setPriority(plan.priority);
    setStatus(plan.status);
    setDescription(plan.description);
    setMilestonesInput(plan.milestones.map((m) => m.text).join('\n'));
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    const milestones = milestonesInput
      .split('\n')
      .map((text, idx) => {
        const existing = plan.milestones.find((m) => m.text === text.trim());
        return {
          id: existing ? existing.id : (idx + 1).toString(),
          text: text.trim(),
          completed: existing ? existing.completed : false,
        };
      })
      .filter((m) => m.text.length > 0);

    try {
      const updated = await dispatch(
        updateFuturePlanAction({
          id: plan.id,
          data: { title, targetQuarter, priority, status, description, milestones },
        })
      ).unwrap();

      setPlan(updated);
      dispatch(showToast({ message: 'Future plan updated successfully!', type: 'success' }));
      setIsModalOpen(false);
    } catch (err: any) {
      dispatch(showToast({ message: 'Failed to update plan', type: 'error' }));
    }
  };

  const toggleMilestone = async (milestoneId: string) => {
    if (!plan) return;
    const updatedMilestones = plan.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );

    try {
      const updated = await dispatch(
        updateFuturePlanAction({ id: plan.id, data: { milestones: updatedMilestones } })
      ).unwrap();
      setPlan(updated);
    } catch (err) {
      dispatch(showToast({ message: 'Failed to toggle milestone', type: 'error' }));
    }
  };

  const handleAddQuickMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !newMilestoneText.trim()) return;

    const newMilestone = {
      id: Date.now().toString(),
      text: newMilestoneText.trim(),
      completed: false,
    };

    const updatedMilestones = [...plan.milestones, newMilestone];

    try {
      const updated = await dispatch(
        updateFuturePlanAction({ id: plan.id, data: { milestones: updatedMilestones } })
      ).unwrap();
      setPlan(updated);
      setNewMilestoneText('');
      dispatch(showToast({ message: 'Milestone added!', type: 'success' }));
    } catch (err) {
      dispatch(showToast({ message: 'Failed to add milestone', type: 'error' }));
    }
  };

  const handleStartEditMilestone = (m: { id: string; text: string; completed: boolean }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMilestoneId(m.id);
    setEditingMilestoneText(m.text);
  };

  const handleSaveEditMilestone = async (milestoneId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!plan || !editingMilestoneText.trim()) return;

    const updatedMilestones = plan.milestones.map((m) =>
      m.id === milestoneId ? { ...m, text: editingMilestoneText.trim() } : m
    );

    try {
      const updated = await dispatch(
        updateFuturePlanAction({ id: plan.id, data: { milestones: updatedMilestones } })
      ).unwrap();
      setPlan(updated);
      setEditingMilestoneId(null);
      setEditingMilestoneText('');
      dispatch(showToast({ message: 'Milestone updated!', type: 'success' }));
    } catch (err) {
      dispatch(showToast({ message: 'Failed to update milestone', type: 'error' }));
    }
  };

  const handleDeleteMilestone = async (milestoneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plan) return;

    const updatedMilestones = plan.milestones.filter((m) => m.id !== milestoneId);

    try {
      const updated = await dispatch(
        updateFuturePlanAction({ id: plan.id, data: { milestones: updatedMilestones } })
      ).unwrap();
      setPlan(updated);
      dispatch(showToast({ message: 'Milestone deleted', type: 'info' }));
    } catch (err) {
      dispatch(showToast({ message: 'Failed to delete milestone', type: 'error' }));
    }
  };

  const handleSaveAdNotes = async () => {
    if (!plan) return;
    try {
      setSavingAdNotes(true);
      const updated = await dispatch(
        updatePartnerNotesAction({
          id: plan.id,
          notes: adNotesInput,
          role: 'AD',
        })
      ).unwrap();
      setPlan(updated);
      dispatch(showToast({ message: 'Partner AD notes saved successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to save notes', type: 'error' }));
    } finally {
      setSavingAdNotes(false);
    }
  };

  const handleSaveNsNotes = async () => {
    if (!plan) return;
    try {
      setSavingNsNotes(true);
      const updated = await dispatch(
        updatePartnerNotesAction({
          id: plan.id,
          notes: nsNotesInput,
          role: 'NS',
        })
      ).unwrap();
      setPlan(updated);
      dispatch(showToast({ message: 'Partner NS notes saved successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to save notes', type: 'error' }));
    } finally {
      setSavingNsNotes(false);
    }
  };

  const handleSaveSharedNotes = async () => {
    if (!plan) return;
    try {
      setSavingSharedNotes(true);
      const updated = await dispatch(
        updatePartnerNotesAction({
          id: plan.id,
          notes: sharedNotesInput,
          role: 'SHARED',
        })
      ).unwrap();
      setPlan(updated);
      dispatch(showToast({ message: 'Joint Strategic Notes saved successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to save notes', type: 'error' }));
    } finally {
      setSavingSharedNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;
    if (confirm(`Permanently delete "${plan.title}"?`)) {
      await dispatch(deleteFuturePlanAction(plan.id));
      dispatch(showToast({ message: 'Future plan deleted', type: 'info' }));
      navigate('/future-plans');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading roadmap details...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Future plan not found</h2>
        <Link
          to="/future-plans"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Future Plans</span>
        </Link>
      </div>
    );
  }

  const completedCount = plan.milestones.filter((m) => m.completed).length;
  const totalMilestones = plan.milestones.length;
  const progressPercent = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/future-plans"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition group"
        >
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Back to Future Plans & Roadmap</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEdit}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Edit className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Edit Plan</span>
          </button>
          <button
            onClick={handleDelete}
            className="px-3.5 py-2 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Detail Header Card */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                <Calendar className="w-3.5 h-3.5" />
                <span>Target Year: {plan.targetQuarter}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {plan.title}
            </h1>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                Created by:{' '}
                <strong className="text-slate-800 dark:text-slate-200">{plan.owner?.name || 'Partner'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Logged: {new Date(plan.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-50 dark:bg-slate-950/70 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Milestone Execution Progress</span>
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">
              {progressPercent}% ({completedCount}/{totalMilestones} Completed)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Scope & Description */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Strategic Plan Scope & Objectives</span>
          </div>
          <div className="bg-pink-100/30 dark:bg-pink-950/20 rounded-2xl p-5 sm:p-6 border border-pink-200/80 dark:border-pink-900/40 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {plan.description}
          </div>
        </div>

        {/* Interactive Milestones Checklist */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <ListTodo className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Interactive Checklist & Deliverables</span>
            </div>
            <span className="text-[11px] text-slate-400">Click to toggle status</span>
          </div>

          <div className="space-y-2">
            {plan.milestones.map((m) =>
              editingMilestoneId === m.id ? (
                <form
                  key={m.id}
                  onSubmit={(e) => handleSaveEditMilestone(m.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border-2 border-indigo-500/80 rounded-2xl shadow-lg transition-all"
                >
                  <input
                    type="text"
                    autoFocus
                    value={editingMilestoneText}
                    onChange={(e) => setEditingMilestoneText(e.target.value)}
                    placeholder="Milestone title..."
                    className="flex-1 bg-transparent px-2 py-1 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="submit"
                      disabled={!editingMilestoneText.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMilestoneId(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={m.id}
                  onClick={() => toggleMilestone(m.id)}
                  className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                    m.completed
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-500 dark:text-slate-400'
                      : 'bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600/50 text-slate-900 dark:text-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    {m.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 dark:text-slate-600 shrink-0" />
                    )}
                    <span
                      className={`text-sm font-medium truncate ${
                        m.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {m.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        m.completed
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {m.completed ? 'Completed' : 'Pending'}
                    </span>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartEditMilestone(m, e)}
                        title="Edit milestone"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMilestone(m.id, e)}
                        title="Delete milestone"
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Quick Add Milestone Form */}
          <form onSubmit={handleAddQuickMilestone} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add another milestone or deliverable..."
              value={newMilestoneText}
              onChange={(e) => setNewMilestoneText(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              type="submit"
              disabled={!newMilestoneText.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Milestone</span>
            </button>
          </form>
        </div>
      </div>

      {/* DUAL-PARTNER COLLABORATION & STRATEGIC NOTES SECTION (AD & NS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <h2 className="text-base font-bold text-pink-800 dark:text-pink-300">
                Partner Strategic Notes & Collaboration
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dedicated notes for Partner AD, Partner NS, and Joint Collaboration Notes accessible and editable by both partners.
            </p>
          </div>
        </div>

        {/* 2-Column Grid: Left Side AD Notes, Right Side NS Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* ===================== PARTNER AD NOTES CARD ===================== */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border flex flex-col justify-between space-y-3.5 transition-all ${
              activeRole === 'AD'
                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-xs'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-800/80'
            }`}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    AD
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Partner AD&apos;s Strategic Directives
                    </h3>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {plan.adNotesUpdatedAt
                        ? `Updated: ${new Date(plan.adNotesUpdatedAt).toLocaleDateString()} ${new Date(
                            plan.adNotesUpdatedAt
                          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'No updates yet'}
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                {activeRole === 'AD' ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <FileEdit className="w-3 h-3" />
                    <span>Editable by You</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Read-Only</span>
                  </span>
                )}
              </div>

              {/* Body: Editable if AD, Read-only if NS */}
              {activeRole === 'AD' ? (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={adNotesInput}
                    onChange={(e) => setAdNotesInput(e.target.value)}
                    placeholder="Partner AD: Enter strategic objectives, architecture notes, budget constraints, or execution instructions..."
                    className="w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between min-h-[30px]">
                    <span className="text-[10px] text-slate-400">
                      {adNotesInput !== (plan.adNotes || '')
                        ? 'Unsaved changes detected'
                        : 'All changes saved to database'}
                    </span>
                    {adNotesInput !== (plan.adNotes || '') ? (
                      <button
                        onClick={handleSaveAdNotes}
                        disabled={savingAdNotes}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        {savingAdNotes ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save AD Notes</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 min-h-[120px] flex flex-col justify-center">
                  {plan.adNotes ? (
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {plan.adNotes}
                    </p>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 italic">
                      Partner AD has not logged any notes on this roadmap item yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===================== PARTNER NS NOTES CARD ===================== */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border flex flex-col justify-between space-y-3.5 transition-all ${
              activeRole === 'NS'
                ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 shadow-xs'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-800/80'
            }`}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    NS
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Partner NS&apos;s Review & Execution
                    </h3>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {plan.nsNotesUpdatedAt
                        ? `Updated: ${new Date(plan.nsNotesUpdatedAt).toLocaleDateString()} ${new Date(
                            plan.nsNotesUpdatedAt
                          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'No updates yet'}
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                {activeRole === 'NS' ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <FileEdit className="w-3 h-3" />
                    <span>Editable by You</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Read-Only</span>
                  </span>
                )}
              </div>

              {/* Body: Editable if NS, Read-only if AD */}
              {activeRole === 'NS' ? (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={nsNotesInput}
                    onChange={(e) => setNsNotesInput(e.target.value)}
                    placeholder="Partner NS: Enter review remarks, operation details, compliance checks, or execution feedback..."
                    className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between min-h-[30px]">
                    <span className="text-[10px] text-slate-400">
                      {nsNotesInput !== (plan.nsNotes || '')
                        ? 'Unsaved changes detected'
                        : 'All changes saved to database'}
                    </span>
                    {nsNotesInput !== (plan.nsNotes || '') ? (
                      <button
                        onClick={handleSaveNsNotes}
                        disabled={savingNsNotes}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        {savingNsNotes ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save NS Notes</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 min-h-[120px] flex flex-col justify-center">
                  {plan.nsNotes ? (
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {plan.nsNotes}
                    </p>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 italic">
                      Partner NS has not logged any notes on this roadmap item yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===================== 3. SHARED / JOINT COLLABORATION NOTES (BOTH USERS) ===================== */}
        <div className="rounded-2xl p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                AD+NS
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Joint Strategic Notes & Shared Consensus</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    Editable by Both AD &amp; NS
                  </span>
                </h3>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {plan.sharedNotesUpdatedAt
                    ? `Last updated by ${plan.sharedNotesUpdatedBy || 'Partner'} on ${new Date(
                        plan.sharedNotesUpdatedAt
                      ).toLocaleDateString()} ${new Date(plan.sharedNotesUpdatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'No joint notes recorded yet'}
                </div>
              </div>
            </div>

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <FileEdit className="w-3 h-3" />
              <span>Shared Collaboration</span>
            </span>
          </div>

          <div className="space-y-2">
            <textarea
              rows={4}
              value={sharedNotesInput}
              onChange={(e) => setSharedNotesInput(e.target.value)}
              placeholder="Shared notes, mutual agreements, decision logs, and joint action items editable by both Partner AD and Partner NS..."
              className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y"
            />
            <div className="flex items-center justify-between min-h-[30px]">
              <span className="text-[10px] text-slate-400">
                {sharedNotesInput !== (plan.sharedNotes || '')
                  ? 'Unsaved changes in joint notes'
                  : 'All joint notes synced to database'}
              </span>
              {sharedNotesInput !== (plan.sharedNotes || '') ? (
                <button
                  onClick={handleSaveSharedNotes}
                  disabled={savingSharedNotes}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  {savingSharedNotes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Joint Notes</span>
                </button>
              ) : (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Future Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30 shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                    Edit Future Plan
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Modify plan scope, targets & milestones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Goal / Plan Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Series A Valuation & Global Cloud Expansion"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target Year
                </label>
                <input
                  type="text"
                  required
                  value={targetQuarter}
                  onChange={(e) => setTargetQuarter(e.target.value)}
                  placeholder="e.g. 2026 or 2027"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Scope & Strategic Objectives
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Define the scope, strategy, target metrics, and partner expectations..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Deliverables & Milestones (One item per line)
                </label>
                <textarea
                  rows={4}
                  value={milestonesInput}
                  onChange={(e) => setMilestonesInput(e.target.value)}
                  placeholder="Draft strategic agreement&#10;Complete infrastructure audit&#10;Execute live rollout"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
