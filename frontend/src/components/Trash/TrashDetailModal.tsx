import React, { useState } from 'react';
import {
  X,
  RotateCcw,

  Trash2,
  Clock,
  User as UserIcon,
  Link as LinkIcon,
  Key,
  Shield,
  FileText,
  Briefcase,
  FolderKanban,
  CheckCircle2,
  Code,
  ExternalLink,
  Receipt,
  Wallet,
  Compass,
  CalendarDays,
  StickyNote,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Edit3,
} from 'lucide-react';
import { api } from '../../services/api';
import { TrashItem, TrashItemType } from '../../types';


interface TrashDetailModalProps {
  item: TrashItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (item: TrashItem) => Promise<void>;
  onPermanentDelete: (item: TrashItem) => Promise<void> | void;
  onUpdateReason?: (item: TrashItem, newReason: string) => Promise<void> | void;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

export const TrashDetailModal: React.FC<TrashDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onRestore,
  onPermanentDelete,
  onUpdateReason,
  isRestoring = false,
  isDeleting = false,
}) => {
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditingReason, setIsEditingReason] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [isSavingReason, setIsSavingReason] = useState(false);


  if (!isOpen || !item) return null;

  const rawData = item.parsedData || (() => {
    try {
      return JSON.parse(item.itemData);
    } catch {
      return {};
    }
  })();

  const handleSaveReason = async () => {
    if (!item) return;
    try {
      setIsSavingReason(true);
      await api.patch(`/trash/${item.id}/reason`, { deleteReason: newReason });
      item.deleteReason = newReason;
      if (onUpdateReason) {
        await onUpdateReason(item, newReason);
      }
      setIsEditingReason(false);
    } catch (e) {
      console.error('Failed to update reason', e);
    } finally {
      setIsSavingReason(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };


  const getTypeColor = (type: TrashItemType) => {
    switch (type) {
      case 'WORK':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30';
      case 'MONEY':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'PAYMENT':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'BUSINESS':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'FUTURE_PLAN':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/30';
      case 'DAY_TO_DAY':
        return 'bg-teal-500/10 text-teal-500 border-teal-500/30';
      case 'VAULT':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'SECRET_NOTE':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'SHARED_NOTE':
        return 'bg-violet-500/10 text-violet-500 border-violet-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getTypeIcon = (type: TrashItemType) => {
    switch (type) {
      case 'WORK': return <FolderKanban className="w-4 h-4" />;
      case 'MONEY': return <Wallet className="w-4 h-4" />;
      case 'PAYMENT': return <Receipt className="w-4 h-4" />;
      case 'BUSINESS': return <Briefcase className="w-4 h-4" />;
      case 'FUTURE_PLAN': return <Compass className="w-4 h-4" />;
      case 'DAY_TO_DAY': return <CalendarDays className="w-4 h-4" />;
      case 'VAULT': return <Key className="w-4 h-4" />;
      case 'SECRET_NOTE': return <Shield className="w-4 h-4" />;
      case 'SHARED_NOTE': return <StickyNote className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const renderContent = () => {
    switch (item.itemType) {
      case 'WORK': {
        let techStack: string[] = [];
        try {
          techStack = Array.isArray(rawData.techStack) ? rawData.techStack : JSON.parse(rawData.techStack || '[]');
        } catch { techStack = []; }

        let credentials: any[] = [];
        try {
          credentials = Array.isArray(rawData.credentials) ? rawData.credentials : JSON.parse(rawData.credentials || '[]');
        } catch { credentials = []; }

        let attachments: any[] = [];
        try {
          attachments = Array.isArray(rawData.attachments) ? rawData.attachments : JSON.parse(rawData.attachments || '[]');
        } catch { attachments = []; }

        return (
          <div className="space-y-6">
            {/* Primary Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Client Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{rawData.clientName || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Place & Country</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rawData.place ? `${rawData.place}${rawData.country ? `, ${rawData.country}` : ''}` : rawData.country || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Status</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {rawData.status || 'IN_PROGRESS'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Payment Info</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {rawData.paymentCurrency || 'USD'} {rawData.paymentAmount?.toLocaleString() || '0'} ({rawData.paymentStatus || 'PENDING'})
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Platform Due Date</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {rawData.platformDueDate ? new Date(rawData.platformDueDate).toLocaleDateString() : 'None'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">DB / Project Due Date</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {rawData.projectDueDate ? new Date(rawData.projectDueDate).toLocaleDateString() : 'None'}
                </span>
              </div>
            </div>

            {/* Tech Stack */}
            {techStack.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tech Stack</h4>
                <div className="flex flex-wrap gap-1.5">
                  {techStack.map((tech, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hosting & Git */}
            {(rawData.hostedPlatform || rawData.gitLink) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rawData.hostedPlatform && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block">Hosted Platform</span>
                    <span className="text-xs font-mono text-slate-800 dark:text-slate-200">{rawData.hostedPlatform}</span>
                  </div>
                )}
                {rawData.gitLink && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block">Git Repository</span>
                    <a href={rawData.gitLink} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-500 hover:underline inline-flex items-center gap-1">
                      {rawData.gitLink} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {rawData.notes && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Project Notes</h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{rawData.notes}</p>
              </div>
            )}

            {/* Credentials */}
            {credentials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Saved Vault Credentials ({credentials.length})</h4>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide Passwords' : 'Reveal Passwords'}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {credentials.map((cred, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{cred.title || cred.service || `Credential #${idx + 1}`}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{cred.username || cred.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {showPassword ? (cred.password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          onClick={() => handleCopy(cred.password || '', `cred-${idx}`)}
                          className="p-1 text-slate-400 hover:text-blue-500 transition"
                          title="Copy Password"
                        >
                          {copiedKey === `cred-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Attachments ({attachments.length})</h4>
                <div className="space-y-1.5">
                  {attachments.map((att: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{att.name || `Attachment #${idx + 1}`}</span>
                      {att.size && <span className="text-[10px] text-slate-400">{att.size}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        );
      }

      case 'PAYMENT': {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Amount</span>
                <span className={`text-xl font-black ${rawData.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {rawData.currency || 'INR'} {rawData.amount?.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Type</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${rawData.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                  {rawData.type}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Month & Date</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{rawData.monthLabel} ({rawData.date})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rawData.category || 'General'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Payment Method</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rawData.paymentMethod || 'Bank Transfer'}</span>
              </div>
            </div>

            {rawData.invoiceNumber && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Invoice Number</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{rawData.invoiceNumber}</span>
              </div>
            )}

            {rawData.specialNotes && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Special Remarks & Tax / ITR Notes</h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{rawData.specialNotes}</p>
              </div>
            )}
          </div>
        );
      }

      case 'MONEY': {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Amount</span>
                <span className={`text-xl font-black ${rawData.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ₹{rawData.amount?.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Payment Mode</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {rawData.paymentMode}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Date</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{rawData.date}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Purpose / For What</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{rawData.forWhat}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Place / Merchant</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rawData.place || 'N/A'}</span>
              </div>
            </div>

            {rawData.notes && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Notes</h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{rawData.notes}</p>
              </div>
            )}
          </div>
        );
      }

      case 'BUSINESS': {
        let tags: string[] = [];
        try {
          tags = Array.isArray(rawData.tags) ? rawData.tags : JSON.parse(rawData.tags || '[]');
        } catch { tags = []; }

        let links: any[] = [];
        try {
          links = Array.isArray(rawData.links) ? rawData.links : JSON.parse(rawData.links || '[]');
        } catch { links = []; }

        return (
          <div className="space-y-6">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</span>
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {rawData.category}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{rawData.description}</p>
            </div>

            {tags.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Reference Links</h4>
                <div className="space-y-1.5">
                  {links.map((link, idx) => (
                    <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-blue-500 hover:underline">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{link.title || link.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'FUTURE_PLAN': {
        let milestones: any[] = [];
        try {
          milestones = Array.isArray(rawData.milestones) ? rawData.milestones : JSON.parse(rawData.milestones || '[]');
        } catch { milestones = []; }

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Target Quarter</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{rawData.targetQuarter}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Priority</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {rawData.priority}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Status</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  {rawData.status}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{rawData.description}</p>
            </div>

            {milestones.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Milestones ({milestones.length})</h4>
                <div className="space-y-1.5">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <CheckCircle2 className={`w-4 h-4 ${m.completed ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className={m.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}>{m.text || m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'DAY_TO_DAY': {
        let tags: string[] = [];
        try {
          tags = Array.isArray(rawData.tags) ? rawData.tags : JSON.parse(rawData.tags || '[]');
        } catch { tags = []; }

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Date</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{rawData.date}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Time</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rawData.time || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Priority</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-500 border border-teal-500/20">
                  {rawData.priority}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Status</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${rawData.isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                  {rawData.isCompleted ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Content</h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{rawData.content}</p>
            </div>

            {tags.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'VAULT': {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Account Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{rawData.accountName}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Username / Email</span>
                <span className="text-sm font-mono text-slate-800 dark:text-slate-200">{rawData.usernameOrEmail || 'N/A'}</span>
              </div>
            </div>

            {rawData.websiteUrl && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Website URL</span>
                <a href={rawData.websiteUrl.startsWith('http') ? rawData.websiteUrl : `https://${rawData.websiteUrl}`} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-500 hover:underline flex items-center gap-1.5">
                  {rawData.websiteUrl} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Encrypted Master Credential
                </span>
                <span className="text-[10px] font-mono text-slate-400">AES-256 Protected</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                The password payload remains encrypted in the trash snapshot. Once restored to the Vault, it can be viewed using your vault master passkey.
              </p>
            </div>

            {rawData.notes && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Vault Notes</h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{rawData.notes}</p>
              </div>
            )}
          </div>
        );
      }

      case 'SECRET_NOTE': {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                  {rawData.category}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Inactivity Release Waiting Period</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{rawData.waitingPeriodHours || 48} Hours</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2 text-red-500">
                <Shield className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Zero-Knowledge Enclave Directive</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                This directive is encrypted client-side with passkey derivation. Restoring it will place it back in your Secret Notes ledger.
              </p>
            </div>
          </div>
        );
      }

      case 'SHARED_NOTE': {
        return (
          <div className="space-y-6">
            {rawData.reminderDate && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Reminder Date</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{new Date(rawData.reminderDate).toLocaleString()}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Note Content</h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{rawData.content}</p>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${getTypeColor(item.itemType)}`}>
              {getTypeIcon(item.itemType)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getTypeColor(item.itemType)}`}>
                  {item.itemType.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Deleted {new Date(item.deletedAt).toLocaleString()}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {item.title}
              </h2>
              {item.subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.subtitle}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deleted By Meta Banner */}
        <div className="px-6 py-2.5 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Deleted by: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{item.deletedBy?.name || item.deletedBy?.email || 'Partner'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                onClick={() => setActiveTab('formatted')}
                className={`px-2.5 py-0.5 rounded-md transition ${activeTab === 'formatted' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-2.5 py-0.5 rounded-md flex items-center gap-1 transition ${activeTab === 'raw' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                <Code className="w-3 h-3" /> Raw JSON
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
          {/* Security Deletion Reason & Audit Justification Card */}
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/25 border border-amber-500/20 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Deletion Reason & Audit Justification
              </span>
              {!isEditingReason ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewReason(item.deleteReason || '');
                    setIsEditingReason(true);
                  }}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{item.deleteReason ? 'Edit Reason' : '+ Add Reason'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveReason}
                    disabled={isSavingReason}
                    className="text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50"
                  >
                    {isSavingReason ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingReason(false)}
                    className="text-[11px] px-2 py-0.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditingReason ? (
              <textarea
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Enter audit reason or compliance note for deleting this item..."
                className="w-full text-xs p-3 rounded-xl border border-amber-500/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={2}
                autoFocus
              />
            ) : (
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                {item.deleteReason ? (
                  item.deleteReason
                ) : (
                  <span className="text-slate-400 italic">No specific deletion reason documented. Click "+ Add Reason" to annotate for audit compliance.</span>
                )}
              </p>
            )}
          </div>

          {activeTab === 'formatted' ? (
            renderContent()
          ) : (

            <div className="relative">
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => handleCopy(JSON.stringify(rawData, null, 2), 'raw-json')}
                  className="px-2 py-1 rounded bg-slate-800 text-white text-[11px] flex items-center gap-1 hover:bg-slate-700 transition"
                >
                  {copiedKey === 'raw-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'raw-json' ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 max-h-[400px]">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onPermanentDelete(item)}
            disabled={isDeleting || isRestoring}
            className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Purging...' : 'Delete Permanently'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isRestoring || isDeleting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
            >
              Close
            </button>
            <button
              onClick={() => onRestore(item)}
              disabled={isRestoring || isDeleting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
              {isRestoring ? 'Restoring...' : 'Restore to Original'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
