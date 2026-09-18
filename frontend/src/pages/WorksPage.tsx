import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import {
  fetchWorks,
  deleteWorkAction,
} from '../store/slices/worksSlice';
import { showToast } from '../store/slices/uiSlice';
import { WorkProject, WorkTechItem } from '../types';
import {
  Briefcase,
  Plus,
  Search,
  Server,
  Phone,
  MessageCircle,
  ExternalLink,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Calendar,
  Clock,
  DollarSign,
  Paperclip,
  Trash2,
  Edit,
  X,
  Loader2,
  FileText,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  User,
  MapPin,
  GitBranch,
  Download,
  Code2,
  Database,
  Cpu,
} from 'lucide-react';

export const POPULAR_PRESETS: Record<'frontend' | 'backend' | 'db' | 'other', string[]> = {
  frontend: [
    'React', 'Next.js', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte',
    'Tailwind CSS', 'TypeScript', 'JavaScript', 'Redux Toolkit', 'Zustand',
    'HTML5 / CSS3', 'Vite', 'Bootstrap', 'Material UI', 'Shadcn UI', 'React Native', 'Flutter'
  ],
  backend: [
    'Node.js', 'Express.js', 'NestJS', 'Python (Django)', 'Python (FastAPI)',
    'Go (Golang)', 'Java (Spring Boot)', 'PHP (Laravel)', 'Ruby on Rails',
    'GraphQL', 'REST API', 'C# (.NET Core)', 'Socket.io', 'gRPC', 'Serverless'
  ],
  db: [
    'PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Supabase',
    'Firebase Firestore', 'Prisma ORM', 'SQLite', 'DynamoDB',
    'MariaDB', 'Elasticsearch', 'Cassandra', 'Oracle DB', 'Neo4j'
  ],
  other: [
    'Docker', 'Kubernetes', 'AWS S3', 'GitHub Actions', 'Nginx',
    'Cloudflare', 'Stripe API', 'JWT Auth', 'Vercel', 'AWS Lambda', 'Linux / VPS'
  ]
};

export const normalizeTechItem = (item: string | WorkTechItem): WorkTechItem => {
  if (typeof item === 'object' && item && item.name) {
    return {
      name: item.name.trim(),
      category: item.category || 'other',
    };
  }
  const str = String(item || '').trim();
  if (str.startsWith('frontend:')) return { category: 'frontend', name: str.replace(/^frontend:/i, '').trim() };
  if (str.startsWith('backend:')) return { category: 'backend', name: str.replace(/^backend:/i, '').trim() };
  if (str.startsWith('db:') || str.startsWith('database:')) return { category: 'db', name: str.replace(/^(db|database):/i, '').trim() };
  if (str.startsWith('other:')) return { category: 'other', name: str.replace(/^other:/i, '').trim() };

  const lower = str.toLowerCase();
  if (POPULAR_PRESETS.frontend.some((p) => p.toLowerCase() === lower)) return { category: 'frontend', name: str };
  if (POPULAR_PRESETS.backend.some((p) => p.toLowerCase() === lower)) return { category: 'backend', name: str };
  if (POPULAR_PRESETS.db.some((p) => p.toLowerCase() === lower)) return { category: 'db', name: str };
  if (POPULAR_PRESETS.other.some((p) => p.toLowerCase() === lower)) return { category: 'other', name: str };

  return { category: 'other', name: str };
};

export const WorksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { works, isLoading } = useSelector((state: RootState) => state.works);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'PLANNING' | 'ON_HOLD'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');

  // Detail Modal State
  const [detailWork, setDetailWork] = useState<WorkProject | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  // Sync detail modal with Redux when updated
  useEffect(() => {
    if (detailWork) {
      const updated = works.find((w) => w.id === detailWork.id);
      if (updated) {
        setDetailWork(updated);
      }
    }
  }, [works]);

  // Copy password helper
  const handleCopy = (text: string, id: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    dispatch(showToast({ message: `Copied ${label} to clipboard`, type: 'success' }));
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const togglePasswordReveal = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteWork = async (work: WorkProject) => {
    if (confirm(`Permanently delete work project "${work.name}" for client "${work.clientName}"?`)) {
      await dispatch(deleteWorkAction(work.id));
      dispatch(showToast({ message: `Work project deleted`, type: 'info' }));
      if (detailWork?.id === work.id) {
        setDetailWork(null);
      }
    }
  };

  // Helper for formatted file size
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Due Date Badge Calculator
  const getDueDateBadge = (dateStr?: string, labelPrefix: string = 'Due') => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3" />
          <span>{labelPrefix}: Overdue ({Math.abs(diffDays)}d)</span>
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
          <Clock className="w-3 h-3" />
          <span>{labelPrefix}: Due Today!</span>
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          <span>{labelPrefix}: in {diffDays}d</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
        <Calendar className="w-3 h-3" />
        <span>{labelPrefix}: {target.toLocaleDateString()}</span>
      </span>
    );
  };

  // Filtered Works List
  const filteredWorks = works.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.careOf && w.careOf.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.place && w.place.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.country && w.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.hostedPlatform && w.hostedPlatform.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (Array.isArray(w.techStack) &&
        w.techStack.some((t) => {
          const item = normalizeTechItem(t);
          return (
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }));

    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || w.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm">
              <Briefcase className="w-6 h-6" />
            </div>
            <span>Works & Client Projects</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Client directories, infrastructure specifications, dynamic credentials vault, attachments, and payment tracking.
          </p>
        </div>

        <button
          onClick={() => navigate('/works/new')}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Work Project</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white dark:bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search works, clients, place, tech stack..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On Hold</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none font-medium"
          >
            <option value="ALL">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Works Grid */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Briefcase className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Works Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first client project card with tech stack, dynamic keys vault, and payment specifications.
          </p>
          <button
            onClick={() => navigate('/works/new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Work</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorks.map((work) => {
            const hasDueSoon =
              (work.platformDueDate && getDueDateBadge(work.platformDueDate, 'Platform')) ||
              (work.dbDueDate && getDueDateBadge(work.dbDueDate, 'DB')) ||
              (work.projectDueDate && getDueDateBadge(work.projectDueDate, 'Delivery'));

            return (
              <div
                key={work.id}
                onClick={() => setDetailWork(work)}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Status & Platform Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        work.status === 'COMPLETED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : work.status === 'IN_PROGRESS'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : work.status === 'PLANNING'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {work.status.replace('_', ' ')}
                    </span>

                    {work.hostedPlatform && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                        <Server className="w-3 h-3 text-indigo-500" />
                        <span>{work.hostedPlatform}</span>
                      </span>
                    )}
                  </div>

                  {/* Work Name & Client Information */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug">
                      {work.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-slate-800 dark:text-slate-200">{work.clientName}</strong>
                      {work.careOf && <span className="text-slate-400">(c/o {work.careOf})</span>}
                    </div>

                    {(work.place || work.country) && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{[work.place, work.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Tech Stack Badges (Categorized: Frontend, Backend, Database) */}
                  {work.techStack && work.techStack.length > 0 && (() => {
                    const normalized = work.techStack.map(normalizeTechItem);
                    const fe = normalized.filter((t) => t.category === 'frontend');
                    const be = normalized.filter((t) => t.category === 'backend');
                    const db = normalized.filter((t) => t.category === 'db');
                    const other = normalized.filter((t) => t.category === 'other');

                    return (
                      <div className="space-y-1 pt-1">
                        {fe.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              FE
                            </span>
                            {fe.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60"
                              >
                                {t.name}
                              </span>
                            ))}
                            {fe.length > 3 && (
                              <span className="text-[9px] font-mono text-slate-400">+{fe.length - 3}</span>
                            )}
                          </div>
                        )}
                        {be.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              BE
                            </span>
                            {be.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60"
                              >
                                {t.name}
                              </span>
                            ))}
                            {be.length > 3 && (
                              <span className="text-[9px] font-mono text-slate-400">+{be.length - 3}</span>
                            )}
                          </div>
                        )}
                        {db.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              DB
                            </span>
                            {db.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60"
                              >
                                {t.name}
                              </span>
                            ))}
                            {db.length > 3 && (
                              <span className="text-[9px] font-mono text-slate-400">+{db.length - 3}</span>
                            )}
                          </div>
                        )}
                        {other.length > 0 && fe.length === 0 && be.length === 0 && db.length === 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                              Tech
                            </span>
                            {other.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Payment & Due Date Highlights */}
                  <div className="space-y-1.5 pt-2">
                    {work.paymentAmount !== undefined && work.paymentAmount !== null && (
                      <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Amount:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-900 dark:text-slate-100 font-mono">
                            {work.paymentCurrency || 'USD'} {work.paymentAmount.toLocaleString()}
                          </strong>
                          <span
                            className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded ${
                              work.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : work.paymentStatus === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {work.paymentStatus}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Due Dates Summary */}
                    {hasDueSoon && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {work.platformDueDate && getDueDateBadge(work.platformDueDate, 'Platform')}
                        {work.dbDueDate && getDueDateBadge(work.dbDueDate, 'DB')}
                        {work.projectDueDate && getDueDateBadge(work.projectDueDate, 'Delivery')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Badges & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    {work.credentials && work.credentials.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{work.credentials.length} Keys</span>
                      </span>
                    )}

                    {work.attachments && work.attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{work.attachments.length} Files</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-xs group-hover:translate-x-0.5 transition">
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* WORK DETAIL MODAL / DRAWER */}
      {/* =================================================================== */}
      {detailWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/85 backdrop-blur-md p-2.5 sm:p-5 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col my-auto transition-all">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {detailWork.name}
                    </h3>
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        detailWork.status === 'COMPLETED'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300'
                          : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border-indigo-300'
                      }`}
                    >
                      {detailWork.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Client: <strong className="text-slate-700 dark:text-slate-300">{detailWork.clientName}</strong>
                    {detailWork.careOf && <span> (c/o {detailWork.careOf})</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    const id = detailWork.id;
                    setDetailWork(null);
                    navigate(`/works/edit/${id}`);
                  }}
                  className="p-1.5 sm:p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Edit Work Project"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteWork(detailWork)}
                  className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Delete Work Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDetailWork(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs">
              {/* Client & Communication Section */}
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span>Client Profile & Contact Coordinates</span>
                  </span>
                  {(detailWork.place || detailWork.country) && (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{[detailWork.place, detailWork.country].filter(Boolean).join(', ')}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Phone Call */}
                  {detailWork.clientPhone ? (
                    <a
                      href={`tel:${detailWork.clientPhone}`}
                      className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 transition"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Phone Contact</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-mono truncate block">
                          {detailWork.clientPhone}
                        </strong>
                      </div>
                    </a>
                  ) : (
                    <div className="p-2.5 bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-400">
                      No Phone Number Registered
                    </div>
                  )}

                  {/* WhatsApp Direct */}
                  {detailWork.clientWhatsapp ? (
                    <a
                      href={`https://wa.me/${detailWork.clientWhatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:border-emerald-500 transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase block">
                          WhatsApp Direct
                        </span>
                        <strong className="text-emerald-900 dark:text-emerald-200 font-mono truncate block">
                          {detailWork.clientWhatsapp}
                        </strong>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-400">
                      No WhatsApp Registered
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Specifications & Links */}
              <div className="space-y-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Technical & Infrastructure Specifications</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Hosted Platform</span>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-indigo-500" />
                      <span>{detailWork.hostedPlatform || 'Not Specified'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Git Repository</span>
                    {detailWork.gitLink ? (
                      <a
                        href={detailWork.gitLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 truncate"
                      >
                        <GitBranch className="w-4 h-4 shrink-0" />
                        <span className="truncate">{detailWork.gitLink}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <div className="text-slate-400 font-mono">No Repository Linked</div>
                    )}
                  </div>
                </div>

                {/* Categorized Tech Stack Grid (Frontend, Backend, Database, Other) */}
                {detailWork.techStack && detailWork.techStack.length > 0 && (() => {
                  const normalized = detailWork.techStack.map(normalizeTechItem);
                  const fe = normalized.filter((t) => t.category === 'frontend');
                  const be = normalized.filter((t) => t.category === 'backend');
                  const db = normalized.filter((t) => t.category === 'db');
                  const other = normalized.filter((t) => t.category === 'other');

                  return (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Technology Stack Architecture</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {normalized.length} Technologies
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Frontend Card */}
                        <div className="p-3 bg-gradient-to-br from-sky-500/5 via-sky-500/10 to-transparent dark:from-sky-950/40 dark:via-sky-900/20 dark:to-transparent rounded-2xl border border-sky-200/80 dark:border-sky-800/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5 text-sky-500" />
                              <span>Frontend UI</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              {fe.length}
                            </span>
                          </div>
                          {fe.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {fe.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-sky-950/80 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 shadow-xs"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No frontend tech specified</p>
                          )}
                        </div>

                        {/* 2. Backend Card */}
                        <div className="p-3 bg-gradient-to-br from-purple-500/5 via-purple-500/10 to-transparent dark:from-purple-950/40 dark:via-purple-900/20 dark:to-transparent rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-purple-500" />
                              <span>Backend & API</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                              {be.length}
                            </span>
                          </div>
                          {be.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {be.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 shadow-xs"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No backend tech specified</p>
                          )}
                        </div>

                        {/* 3. Database Card */}
                        <div className="p-3 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-transparent rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Database (DB)</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {db.length}
                            </span>
                          </div>
                          {db.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {db.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-xs"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No database specified</p>
                          )}
                        </div>
                      </div>

                      {/* 4. Other Tools & DevOps (if any) */}
                      {other.length > 0 && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10">
                            DevOps / Other
                          </span>
                          {other.map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Notes / Description */}
                {detailWork.notes && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Project Notes / Instructions</span>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {detailWork.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Credentials & Keys Vault */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                    <span>Credentials & Access Keys Vault ({detailWork.credentials?.length || 0})</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Encrypted & Masked</span>
                  </span>
                </div>

                {!detailWork.credentials || detailWork.credentials.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                    No credentials stored for this work project.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {detailWork.credentials.map((cred) => {
                      const isRevealed = revealedPasswords[cred.id] || false;
                      const isCopied = copiedKeyId === cred.id;

                      return (
                        <div
                          key={cred.id}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] uppercase">
                                {cred.label || 'Access Key'}
                              </span>
                              {cred.serviceType && (
                                <span className="text-[10px] text-slate-400 font-semibold">{cred.serviceType}</span>
                              )}
                            </div>

                            {cred.email && (
                              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
                                <span>User/Email:</span>
                                <strong className="text-slate-800 dark:text-slate-200">{cred.email}</strong>
                              </div>
                            )}

                            {cred.password && (
                              <div className="text-xs font-mono flex items-center gap-2">
                                <span className="text-slate-400">Pass / Secret:</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">
                                  {isRevealed ? cred.password : '••••••••••••'}
                                </span>
                              </div>
                            )}

                            {cred.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">{cred.notes}</p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            {cred.password && (
                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(cred.id)}
                                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600"
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-indigo-500" />}
                              </button>
                            )}

                            {cred.password && (
                              <button
                                type="button"
                                onClick={() => handleCopy(cred.password || '', cred.id, cred.label)}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Attachments & Files */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <Paperclip className="w-4 h-4 text-indigo-500" />
                    <span>Uploaded Project Files ({detailWork.attachments?.length || 0})</span>
                  </span>
                </div>

                {!detailWork.attachments || detailWork.attachments.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                    No files or attachments uploaded for this work.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {detailWork.attachments.map((att) => {
                      const isImg = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);

                      return (
                        <div
                          key={att.id}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2.5 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {isImg && att.dataUrl ? (
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="w-9 h-9 rounded-lg object-cover bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
                                {att.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {formatFileSize(att.size)}
                              </p>
                            </div>
                          </div>

                          <a
                            href={att.dataUrl}
                            download={att.name}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-xs shrink-0"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Financials & Payment Breakdown */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">
                  Payment & Escrow Specifications
                </span>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Agreed Amount</span>
                    <strong className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {detailWork.paymentCurrency || 'USD'} {detailWork.paymentAmount ? detailWork.paymentAmount.toLocaleString() : '0'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Payment Method / Via</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {detailWork.paymentVia || 'Bank / Direct'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Payment Status</span>
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                        detailWork.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                      }`}
                    >
                      {detailWork.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Renewal & Milestone Due Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Renewal</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {detailWork.platformDueDate ? new Date(detailWork.platformDueDate).toLocaleDateString() : 'None'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Database Renewal</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {detailWork.dbDueDate ? new Date(detailWork.dbDueDate).toLocaleDateString() : 'None'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Project Milestone</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {detailWork.projectDueDate ? new Date(detailWork.projectDueDate).toLocaleDateString() : 'None'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {detailWork.notes && (
                <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                    Project Notes & Architecture Description
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {detailWork.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <span className="text-[10px] text-slate-400">
                Created: {new Date(detailWork.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => setDetailWork(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
