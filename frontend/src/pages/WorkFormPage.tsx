import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  createWorkAction,
  updateWorkAction,
  fetchWorks,
} from '../store/slices/worksSlice';
import { showToast } from '../store/slices/uiSlice';
import { WorkCredential, WorkAttachment, WorkTechItem } from '../types';
import { POPULAR_PRESETS, normalizeTechItem } from './WorksPage';
import {
  Briefcase,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Calendar,
  Clock,
  DollarSign,
  Paperclip,
  X,
  Loader2,
  FileText,
  UploadCloud,
  User,
  GitBranch,
  ExternalLink,
  Phone,
  MessageCircle,
  KeyRound,
  Code2,
  Database,
  Cpu,
  Sparkles,
  Globe,
} from 'lucide-react';

export const WorkFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const isEditMode = Boolean(id);

  const { works } = useSelector((state: RootState) => state.works);

  // Form Fields State
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [careOf, setCareOf] = useState('');
  const [place, setPlace] = useState('');
  const [country, setCountry] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [hostedPlatform, setHostedPlatform] = useState('');
  const [gitLink, setGitLink] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'>('IN_PROGRESS');
  const [isShared, setIsShared] = useState(true);

  // Dynamic Categorized Tech Stack
  const [techStack, setTechStack] = useState<WorkTechItem[]>([]);
  const [selectedTechCategory, setSelectedTechCategory] = useState<'frontend' | 'backend' | 'db' | 'other'>('frontend');
  const [tagInput, setTagInput] = useState('');

  // Dynamic Credentials Vault
  const [credentials, setCredentials] = useState<WorkCredential[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<WorkAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('USD');
  const [paymentVia, setPaymentVia] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'>('PENDING');

  // Due Dates
  const [platformDueDate, setPlatformDueDate] = useState('');
  const [dbDueDate, setDbDueDate] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(!isEditMode);

  useEffect(() => {
    if (works.length === 0) {
      dispatch(fetchWorks());
    }
  }, [dispatch, works.length]);

  // Populate form if in edit mode
  useEffect(() => {
    if (isEditMode && id && works.length > 0 && !isInitialized) {
      const existing = works.find((w) => w.id === id);
      if (existing) {
        setName(existing.name);
        setClientName(existing.clientName);
        setCareOf(existing.careOf || '');
        setPlace(existing.place || '');
        setCountry(existing.country || '');
        setClientPhone(existing.clientPhone || '');
        setClientWhatsapp(existing.clientWhatsapp || '');
        setHostedPlatform(existing.hostedPlatform || '');
        setGitLink(existing.gitLink || '');
        setNotes(existing.notes || '');
        setStatus(existing.status);
        setIsShared(existing.isShared ?? true);

        const normalizedTech = Array.isArray(existing.techStack)
          ? existing.techStack.map(normalizeTechItem)
          : [];
        setTechStack(normalizedTech);

        setCredentials(Array.isArray(existing.credentials) ? [...existing.credentials] : []);
        setAttachments(Array.isArray(existing.attachments) ? [...existing.attachments] : []);
        setPaymentAmount(existing.paymentAmount !== undefined && existing.paymentAmount !== null ? existing.paymentAmount.toString() : '');
        setPaymentCurrency(existing.paymentCurrency || 'USD');
        setPaymentVia(existing.paymentVia || '');
        setPaymentStatus(existing.paymentStatus || 'PENDING');
        setPlatformDueDate(existing.platformDueDate ? existing.platformDueDate.substring(0, 10) : '');
        setDbDueDate(existing.dbDueDate ? existing.dbDueDate.substring(0, 10) : '');
        setProjectDueDate(existing.projectDueDate ? existing.projectDueDate.substring(0, 10) : '');
        setIsInitialized(true);
      }
    }
  }, [isEditMode, id, works, isInitialized]);

  // Tech Stack Handlers
  const handleAddTechTag = (
    customName?: string,
    categoryOverride?: 'frontend' | 'backend' | 'db' | 'other'
  ) => {
    const cat = categoryOverride || selectedTechCategory;
    const nameToAdd = (customName !== undefined ? customName : tagInput).trim().replace(/,/g, '');
    if (!nameToAdd) return;

    const exists = techStack.some(
      (t) => t.name.toLowerCase() === nameToAdd.toLowerCase() && t.category === cat
    );
    if (!exists) {
      setTechStack([...techStack, { name: nameToAdd, category: cat }]);
    }
    if (customName === undefined) {
      setTagInput('');
    }
  };

  const handleRemoveTechTag = (indexToRemove: number) => {
    setTechStack(techStack.filter((_, idx) => idx !== indexToRemove));
  };

  // Dynamic Credentials Handlers
  const handleAddCredential = () => {
    const newCred: WorkCredential = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: '',
      email: '',
      password: '',
      serviceType: 'Database',
      notes: '',
    };
    setCredentials([...credentials, newCred]);
  };

  const handleUpdateCredential = (idToUpdate: string, field: keyof WorkCredential, value: string) => {
    setCredentials(
      credentials.map((cred) => (cred.id === idToUpdate ? { ...cred, [field]: value } : cred))
    );
  };

  const handleRemoveCredential = (idToRemove: string) => {
    setCredentials(credentials.filter((cred) => cred.id !== idToRemove));
  };

  const handleCopyPassword = (credId: string, pwd?: string) => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setCopiedKeyId(credId);
    setTimeout(() => setCopiedKeyId(null), 2000);
    dispatch(showToast({ message: 'Credential password copied to clipboard!', type: 'success' }));
  };

  // Attachments Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        dispatch(
          showToast({
            message: `File "${file.name}" exceeds maximum allowed limit (10MB).`,
            type: 'error',
          })
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: WorkAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result as string,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(attachments.filter((a) => a.id !== attId));
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim()) {
      dispatch(showToast({ message: 'Please enter Work Name and Client Name', type: 'warning' }));
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      clientName: clientName.trim(),
      careOf: careOf.trim() || undefined,
      place: place.trim() || undefined,
      country: country.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientWhatsapp: clientWhatsapp.trim() || undefined,
      hostedPlatform: hostedPlatform.trim() || undefined,
      gitLink: gitLink.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      techStack,
      credentials,
      attachments,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
      paymentCurrency,
      paymentVia: paymentVia.trim() || undefined,
      paymentStatus,
      platformDueDate: platformDueDate || undefined,
      dbDueDate: dbDueDate || undefined,
      projectDueDate: projectDueDate || undefined,
      isShared,
    };

    try {
      if (isEditMode && id) {
        await dispatch(updateWorkAction({ id, data: payload })).unwrap();
        dispatch(showToast({ message: `Project "${name}" updated successfully!`, type: 'success' }));
      } else {
        await dispatch(createWorkAction(payload)).unwrap();
        dispatch(showToast({ message: `New project "${name}" created successfully!`, type: 'success' }));
      }
      navigate('/works');
    } catch (err: any) {
      dispatch(showToast({ message: err || 'Failed to save project', type: 'error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 max-w-5xl mx-auto animate-fade-in">
      {/* Top Header & Sticky Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link to="/works" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-bold flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Works</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isEditMode ? 'Edit Project' : 'New Project'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm">
              <Briefcase className="w-6 h-6" />
            </div>
            <span>{isEditMode ? `Edit "${name || 'Project'}"` : 'Create New Work Project'}</span>
          </h1>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/works')}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-center"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Update' : 'Save & Publish'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Form Cards Layout */}
      <div className="grid grid-cols-1 gap-6">
        {/* SECTION 1: Client & Project Core Identity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Client & Project Identity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Project naming, client profile, and direct communication contacts.
                </p>
              </div>
            </div>

            {/* Status Selector Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Project Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="IN_PROGRESS">⚡ IN PROGRESS</option>
                <option value="PLANNING">📝 PLANNING</option>
                <option value="COMPLETED">✅ COMPLETED</option>
                <option value="ON_HOLD">⏸️ ON HOLD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Work / Project Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enterprise E-Commerce Engine / Mobile App API"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Client Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corporation / John Doe"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Care Of (c/o)
              </label>
              <input
                type="text"
                value={careOf}
                onChange={(e) => setCareOf(e.target.value)}
                placeholder="e.g. Marketing Dept / CTO Office"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Place / City
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. London / Dubai / Bangalore / New York"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United Kingdom / UAE / USA / India"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Client Contact Number
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g. +44 7911 123456"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>WhatsApp Number</span>
                {clientWhatsapp && (
                  <a
                    href={`https://wa.me/${clientWhatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-600 hover:underline font-normal flex items-center gap-0.5"
                  >
                    <span>Test Chat</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </label>
              <div className="relative">
                <MessageCircle className="w-3.5 h-3.5 absolute left-3 top-3 text-emerald-500" />
                <input
                  type="text"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  placeholder="e.g. +44 7911 123456"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Share Project with Dual-Partner
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: Technical Infrastructure & Categorized Tech Stack */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Technical Stack & Infrastructure
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hosting servers, repository, and categorized Frontend, Backend, and Database stack architecture.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Hosted Platform / Server
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={hostedPlatform}
                  onChange={(e) => setHostedPlatform(e.target.value)}
                  placeholder="e.g. AWS EC2 / Vercel / DigitalOcean / Supabase"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Git Repository Link
              </label>
              <div className="relative">
                <GitBranch className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={gitLink}
                  onChange={(e) => setGitLink(e.target.value)}
                  placeholder="e.g. https://github.com/org/project-repo"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Categorized Tech Stack Builder */}
          <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                  Categorized Tech Stack Architecture
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select category, choose preset option or type custom technology and press Enter.
                </p>
              </div>

              {/* Category Selector Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 text-xs overflow-x-auto no-scrollbar max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedTechCategory('frontend')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    selectedTechCategory === 'frontend'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Frontend</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTechCategory('backend')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    selectedTechCategory === 'backend'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Backend</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTechCategory('db')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    selectedTechCategory === 'db'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Database</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTechCategory('other')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    selectedTechCategory === 'other'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tools</span>
                </button>
              </div>
            </div>

            {/* Quick Option Select Dropdown & Custom Input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddTechTag(e.target.value, selectedTechCategory);
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="">
                    ⚡ Choose {selectedTechCategory === 'frontend' ? 'Frontend' : selectedTechCategory === 'backend' ? 'Backend' : selectedTechCategory === 'db' ? 'Database' : 'Tool'} Option...
                  </option>
                  {POPULAR_PRESETS[selectedTechCategory].map((tech) => (
                    <option key={tech} value={tech}>
                      + {tech}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-7 flex gap-1.5">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTechTag();
                    }
                  }}
                  placeholder={`Type custom ${selectedTechCategory === 'frontend' ? 'Frontend' : selectedTechCategory === 'backend' ? 'Backend' : selectedTechCategory === 'db' ? 'Database' : 'Tool'} & press Enter...`}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleAddTechTag()}
                  className={`px-4 py-2.5 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                    selectedTechCategory === 'frontend'
                      ? 'bg-sky-600 hover:bg-sky-500'
                      : selectedTechCategory === 'backend'
                      ? 'bg-purple-600 hover:bg-purple-500'
                      : selectedTechCategory === 'db'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Separated Visual Lists */}
            <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
              {/* Frontend */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-sky-500" />
                    <span>Frontend UI Stack</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {techStack.filter((t) => t.category === 'frontend').length} added
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white dark:bg-slate-900 rounded-xl border border-sky-200/60 dark:border-sky-900/40 items-center">
                  {techStack.filter((t) => t.category === 'frontend').length > 0 ? (
                    techStack.map((tech, i) => {
                      if (tech.category !== 'frontend') return null;
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-800"
                        >
                          <span>{tech.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTechTag(i)}
                            className="hover:text-rose-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No frontend tech added yet.</span>
                  )}
                </div>
              </div>

              {/* Backend */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-500" />
                    <span>Backend & API Stack</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {techStack.filter((t) => t.category === 'backend').length} added
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/60 dark:border-purple-900/40 items-center">
                  {techStack.filter((t) => t.category === 'backend').length > 0 ? (
                    techStack.map((tech, i) => {
                      if (tech.category !== 'backend') return null;
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800"
                        >
                          <span>{tech.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTechTag(i)}
                            className="hover:text-rose-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No backend tech added yet.</span>
                  )}
                </div>
              </div>

              {/* Database */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>Database & Storage (DB)</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {techStack.filter((t) => t.category === 'db').length} added
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 items-center">
                  {techStack.filter((t) => t.category === 'db').length > 0 ? (
                    techStack.map((tech, i) => {
                      if (tech.category !== 'db') return null;
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                        >
                          <span>{tech.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTechTag(i)}
                            className="hover:text-rose-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No database tech added yet.</span>
                  )}
                </div>
              </div>

              {/* Tools */}
              {techStack.filter((t) => t.category === 'other').length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Other Tools & DevOps</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-900/40 items-center">
                    {techStack.map((tech, i) => {
                      if (tech.category !== 'other') return null;
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                        >
                          <span>{tech.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTechTag(i)}
                            className="hover:text-rose-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Dynamic Credentials & Keys Vault */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Credentials & Access Keys Vault
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Custom labeled secrets, connection strings, API keys, and admin logins.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddCredential}
              className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Key / Password</span>
            </button>
          </div>

          {credentials.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {credentials.map((cred, idx) => (
                <div
                  key={cred.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      #{idx + 1} Secret Key Entry
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCredential(cred.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="Remove Credential"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Tag / Key Label <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cred.label}
                        onChange={(e) => handleUpdateCredential(cred.id, 'label', e.target.value)}
                        placeholder="e.g. Supabase Secret, DB Admin, Stripe Key"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Service Category
                      </label>
                      <select
                        value={cred.serviceType || 'Database'}
                        onChange={(e) => handleUpdateCredential(cred.id, 'serviceType', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="Database">🗄️ Database</option>
                        <option value="Hosting">☁️ Hosting & Cloud</option>
                        <option value="API Key">🔑 API Key / Token</option>
                        <option value="Authentication">🛡️ Authentication / JWT</option>
                        <option value="Server SSH">💻 Server SSH / VPS</option>
                        <option value="Payment Gateway">💳 Payment Gateway</option>
                        <option value="Other">🛠️ Other Access</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Email / Username / Host
                      </label>
                      <input
                        type="text"
                        value={cred.email || ''}
                        onChange={(e) => handleUpdateCredential(cred.id, 'email', e.target.value)}
                        placeholder="e.g. admin@project.com or root"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Password / Secret Key
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={revealedPasswords[cred.id] ? 'text' : 'password'}
                          value={cred.password || ''}
                          onChange={(e) => handleUpdateCredential(cred.id, 'password', e.target.value)}
                          placeholder="Secret Key / Password"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-16 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        />
                        <div className="absolute right-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswords({
                                ...revealedPasswords,
                                [cred.id]: !revealedPasswords[cred.id],
                              })
                            }
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                            title={revealedPasswords[cred.id] ? 'Hide' : 'Reveal'}
                          >
                            {revealedPasswords[cred.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {cred.password && (
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(cred.id, cred.password)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition"
                              title="Copy"
                            >
                              {copiedKeyId === cred.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cred.notes || ''}
                      onChange={(e) => handleUpdateCredential(cred.id, 'notes', e.target.value)}
                      placeholder="Notes / instructions for this key (e.g. port 5432, sslmode=require, production db)"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
              <KeyRound className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                No credentials added yet. Click <strong>"+ Add Key / Password"</strong> to record database URLs, admin logins, or API keys.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 4: Attachments & Document Assets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Attachments & Documentation Files
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload architecture diagrams, PDF contracts, config JSONs, Markdown specs, or images.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Files</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {attachments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {att.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatFileSize(att.size)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2 cursor-pointer hover:border-teal-500 transition"
            >
              <UploadCloud className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Drag & drop or click to upload project assets (Images, PDF, DOCX, TXT, JSON, MD up to 10MB).
              </p>
            </div>
          )}
        </div>

        {/* SECTION 5 & 6: Commercials & Renewal Due Dates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commercials & Billing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Commercials & Payment
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Contract fee, payment method, and billing status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  Contract Amount
                </label>
                <input
                  type="number"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  Currency
                </label>
                <select
                  value={paymentCurrency}
                  onChange={(e) => setPaymentCurrency(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  Payment Via / Method
                </label>
                <input
                  type="text"
                  value={paymentVia}
                  onChange={(e) => setPaymentVia(e.target.value)}
                  placeholder="e.g. Bank Wire / Stripe / PayPal / UPI / Cash"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                >
                  <option value="PENDING">⏳ PENDING</option>
                  <option value="PARTIAL">🌓 PARTIAL</option>
                  <option value="PAID">✅ PAID IN FULL</option>
                  <option value="OVERDUE">🚨 OVERDUE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Renewal Due Dates */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Renewal Dates & Milestone Due Dates
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated alerts trigger on the Notifications page within 7 days.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  <span>Hosted Platform Renewal Due Date</span>
                </label>
                <input
                  type="date"
                  value={platformDueDate}
                  onChange={(e) => setPlatformDueDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Database Subscription Renewal Due Date</span>
                </label>
                <input
                  type="date"
                  value={dbDueDate}
                  onChange={(e) => setDbDueDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Project Deliverables Milestone Due Date</span>
                </label>
                <input
                  type="date"
                  value={projectDueDate}
                  onChange={(e) => setProjectDueDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: Notes & Technical Description */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Project Notes, Architecture & Requirements
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed instructions, client specifications, deployment checklists, and architecture notes.
              </p>
            </div>
          </div>

          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write architecture notes, deployment instructions, client handover details, or special instructions..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
          />
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div
        className="sticky md:bottom-4 z-20 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.25rem)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/works')}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Works</span>
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => navigate('/works')}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition text-center"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-2 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Update Project' : 'Save & Publish Project'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
