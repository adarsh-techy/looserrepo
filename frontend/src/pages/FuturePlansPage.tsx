import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchFuturePlans,
  createFuturePlanAction,
  updateFuturePlanAction,
  deleteFuturePlanAction,
} from '../store/slices/futurePlansSlice';
import { showToast } from '../store/slices/uiSlice';
import { FuturePlan } from '../types';
import {
  Compass,
  Briefcase,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export const FuturePlansPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { plans, isLoading } = useSelector((state: RootState) => state.futurePlans);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FuturePlan | null>(null);

  const [title, setTitle] = useState('');
  const [targetQuarter, setTargetQuarter] = useState('2026');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [status, setStatus] = useState<'IDEA' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [description, setDescription] = useState('');
  const [milestonesInput, setMilestonesInput] = useState('');

  useEffect(() => {
    dispatch(fetchFuturePlans({ search }));
  }, [dispatch, search]);

  const handleOpenModal = (plan?: FuturePlan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (plan) {
      setEditingPlan(plan);
      setTitle(plan.title);
      setTargetQuarter(plan.targetQuarter);
      setPriority(plan.priority);
      setStatus(plan.status);
      setDescription(plan.description);
      setMilestonesInput(plan.milestones.map(m => m.text).join('\n'));
    } else {
      setEditingPlan(null);
      setTitle('');
      setTargetQuarter('2026');
      setPriority('HIGH');
      setStatus('IN_PROGRESS');
      setDescription('');
      setMilestonesInput('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const milestones = milestonesInput
      .split('\n')
      .map((text, idx) => ({ id: (idx + 1).toString(), text: text.trim(), completed: false }))
      .filter(m => m.text.length > 0);

    try {
      if (editingPlan) {
        await dispatch(
          updateFuturePlanAction({
            id: editingPlan.id,
            data: { title, targetQuarter, priority, status, description, milestones },
          })
        ).unwrap();
        dispatch(showToast({ message: 'Future plan updated', type: 'success' }));
      } else {
        await dispatch(
          createFuturePlanAction({ title, targetQuarter, priority, status, description, milestones })
        ).unwrap();
        dispatch(showToast({ message: 'Future plan created', type: 'success' }));
      }
      setIsModalOpen(false);
    } catch (err) {
      dispatch(showToast({ message: 'Failed to save plan', type: 'error' }));
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this future plan?')) {
      await dispatch(deleteFuturePlanAction(id));
      dispatch(showToast({ message: 'Plan deleted', type: 'info' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Future Plans & Roadmap</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Strategic milestones, venture goals, and future joint initiatives.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Future Plan</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search plans, goals, milestones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Compass className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Business Plans Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your next strategic business plan or venture together.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/future-plans/${plan.id}`)}
              className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/80 rounded-3xl p-6 sm:p-7 min-h-[180px] sm:min-h-[200px] flex flex-col justify-between shadow-sm hover:shadow-xl dark:shadow-xl transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Top Row: Icon & Quick Actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <Briefcase className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenModal(plan, e)}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    title="Edit Plan"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(plan.id, e)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Center: Business / Plan Name */}
              <div className="my-auto py-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {plan.title}
                </h3>
              </div>

              {/* Bottom: Open Details CTA */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium text-slate-400">Strategic Venture</span>
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>View Roadmap</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                    {editingPlan ? 'Edit Future Plan' : 'Create Future Plan'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Milestones, venture goals & roadmap
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

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Goal / Plan Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next-Gen Autonomous Operations"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Year</label>
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
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline requirements, architecture, and scope..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Milestones (One milestone per line)</label>
                <textarea
                  rows={3}
                  value={milestonesInput}
                  onChange={(e) => setMilestonesInput(e.target.value)}
                  placeholder="Architecture review&#10;Security testing&#10;Production deploy"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
                >
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
