import React, { useState, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  RefreshCw,
  FolderKanban,
  Receipt,
  Wallet,
  Briefcase,
  Compass,
  CalendarDays,
  Key,
  Shield,
  StickyNote,
  FileText,
  AlertTriangle,
  Eye,
  CheckCircle2,
  X,
  LayoutGrid,
  List,
  Clock,
  User as UserIcon,
  ShieldAlert,
} from 'lucide-react';


import { api } from '../services/api';
import { TrashItem, TrashItemType } from '../types';
import { TrashDetailModal } from '../components/Trash/TrashDetailModal';

export const TrashPage: React.FC = () => {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Deletion / Restore Action State
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmPermanentItem, setConfirmPermanentItem] = useState<TrashItem | null>(null);
  const [purgeReason, setPurgeReason] = useState<string>('');
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState<boolean>(false);
  const [emptyTrashReason, setEmptyTrashReason] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get<{ items: TrashItem[]; total: number; countsByType: Record<string, number> }>(
        `/trash?${params.toString()}`
      );

      setItems(res.items || []);
      setCountsByType(res.countsByType || {});
    } catch (error: any) {
      console.error('Failed to load trash items:', error);
      showToast(error.message || 'Failed to fetch trash items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrashItems();
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      setRestoringId(item.id);
      setIsActionLoading(true);
      const res = await api.post(`/trash/${item.id}/restore`);
      
      showToast(res.message || `"${item.title}" was restored successfully!`, 'success');
      
      // Remove from active list
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setCountsByType((prev) => ({
        ...prev,
        [item.itemType]: Math.max(0, (prev[item.itemType] || 1) - 1),
        ALL: Math.max(0, (prev.ALL || 1) - 1),
      }));

      if (isDetailOpen) {
        setIsDetailOpen(false);
        setSelectedItem(null);
      }
    } catch (error: any) {
      console.error('Failed to restore item:', error);
      showToast(error.message || 'Failed to restore item', 'error');
    } finally {
      setRestoringId(null);
      setIsActionLoading(false);
    }
  };

  const handlePermanentDelete = async (item: TrashItem, reasonText?: string) => {
    try {
      setDeletingId(item.id);
      setIsActionLoading(true);
      await api.delete(`/trash/${item.id}`, { reason: reasonText || purgeReason });

      showToast(`"${item.title}" permanently eradicated from vault`, 'info');

      // Remove from active list
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setCountsByType((prev) => ({
        ...prev,
        [item.itemType]: Math.max(0, (prev[item.itemType] || 1) - 1),
        ALL: Math.max(0, (prev.ALL || 1) - 1),
      }));

      setConfirmPermanentItem(null);
      setPurgeReason('');
      if (isDetailOpen) {
        setIsDetailOpen(false);
        setSelectedItem(null);
      }
    } catch (error: any) {
      console.error('Failed to delete item permanently:', error);
      showToast(error.message || 'Failed to permanently delete item', 'error');
    } finally {
      setDeletingId(null);
      setIsActionLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      setIsActionLoading(true);
      const res = await api.delete(`/trash?type=${selectedType}`, { reason: emptyTrashReason });
      showToast(res.message || 'Trash emptied successfully', 'info');
      setConfirmEmptyTrash(false);
      setEmptyTrashReason('');
      fetchTrashItems();
    } catch (error: any) {
      console.error('Failed to empty trash:', error);
      showToast(error.message || 'Failed to empty trash', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };


  const openDetail = (item: TrashItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const typeTabs: { type: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'ALL', label: 'All Items', icon: Trash2 },
    { type: 'WORK', label: 'Works', icon: FolderKanban },
    { type: 'MONEY', label: 'Money Records', icon: Wallet },
    { type: 'PAYMENT', label: 'Payments', icon: Receipt },
    { type: 'BUSINESS', label: 'Business', icon: Briefcase },
    { type: 'FUTURE_PLAN', label: 'Future Plans', icon: Compass },
    { type: 'DAY_TO_DAY', label: 'Day to Day', icon: CalendarDays },
    { type: 'VAULT', label: 'Passwords', icon: Key },
    { type: 'SECRET_NOTE', label: 'Secret Notes', icon: Shield },
    { type: 'SHARED_NOTE', label: 'Reminders & Notes', icon: StickyNote },
  ];

  const getTypeStyle = (type: TrashItemType) => {
    switch (type) {
      case 'WORK':
        return {
          bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
          icon: <FolderKanban className="w-4 h-4 text-indigo-500" />,
          name: 'Work Project',
        };
      case 'MONEY':
        return {
          bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          icon: <Wallet className="w-4 h-4 text-emerald-500" />,
          name: 'Money Record',
        };
      case 'PAYMENT':
        return {
          bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          icon: <Receipt className="w-4 h-4 text-blue-500" />,
          name: 'Payment Record',
        };
      case 'BUSINESS':
        return {
          bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          icon: <Briefcase className="w-4 h-4 text-amber-500" />,
          name: 'Business Item',
        };
      case 'FUTURE_PLAN':
        return {
          bg: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
          icon: <Compass className="w-4 h-4 text-sky-500" />,
          name: 'Future Plan',
        };
      case 'DAY_TO_DAY':
        return {
          bg: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
          icon: <CalendarDays className="w-4 h-4 text-teal-500" />,
          name: 'Day to Day',
        };
      case 'VAULT':
        return {
          bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          icon: <Key className="w-4 h-4 text-rose-500" />,
          name: 'Password Vault',
        };
      case 'SECRET_NOTE':
        return {
          bg: 'bg-red-500/10 text-red-500 border-red-500/20',
          icon: <Shield className="w-4 h-4 text-red-500" />,
          name: 'Secret Note',
        };
      case 'SHARED_NOTE':
        return {
          bg: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
          icon: <StickyNote className="w-4 h-4 text-violet-500" />,
          name: 'Shared Reminder',
        };
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: <FileText className="w-4 h-4 text-slate-400" />,
          name: type,
        };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const totalCount = countsByType.ALL || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/60 backdrop-blur-md'
              : toast.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-800/60 backdrop-blur-md'
              : 'bg-slate-900/90 text-slate-200 border-slate-700/60 backdrop-blur-md'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
          {toast.type === 'info' && <Trash2 className="w-5 h-5 text-slate-300 shrink-0" />}
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg transition ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/40 p-6 sm:p-8 border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/25 shrink-0">
              <Trash2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Recycle Bin & Trash
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  {totalCount} item{totalCount === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Deleted workspace items across Works, Money Records, Payments, Passwords, and Notes are safely kept in this archive. Inspect details anytime or restore them back to active state.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={fetchTrashItems}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition flex items-center justify-center"
              title="Refresh Trash"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {items.length > 0 && (
              <button
                onClick={() => setConfirmEmptyTrash(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4" />
                Empty {selectedType !== 'ALL' ? selectedType.replace(/_/g, ' ') : 'Trash'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {typeTabs.map((tab) => {
            const Icon = tab.icon;
            const count = countsByType[tab.type] || 0;
            const isSelected = selectedType === tab.type;

            return (
              <button
                key={tab.type}
                onClick={() => setSelectedType(tab.type)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Layout View Controller */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search deleted items by title, client, purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchTrashItems();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-400 font-medium">
              Showing {items.length} of {totalCount} item{totalCount === 1 ? '' : 's'}
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-xs text-slate-400 font-medium">Scanning trash archive...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6">
          <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 mb-3">
            <Trash2 className="w-10 h-10 stroke-1" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {searchQuery ? 'No matching deleted items found' : 'Trash is completely empty'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery
              ? 'Try adjusting your search terms or filter tabs.'
              : 'Items you delete across the workspace will appear here so you can easily restore them.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const style = getTypeStyle(item.itemType);
            const isRestoring = restoringId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="group relative bg-white dark:bg-slate-900/70 hover:dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Card Header: Type Badge & Deletion time */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${style.bg}`}>
                      {style.icon}
                      <span>{style.name}</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(item.deletedAt)}
                    </span>
                  </div>

                  {/* Title & Subtitle (Clickable to view detail) */}
                  <div
                    onClick={() => openDetail(item)}
                    className="cursor-pointer space-y-1 group-hover:text-blue-500 transition"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition line-clamp-2">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}
                    {item.deleteReason && (
                      <div className="pt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span className="truncate">Reason: {item.deleteReason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Deleted By user & Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate max-w-[120px] sm:max-w-[140px]">
                    <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{item.deletedBy?.name || 'Partner'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openDetail(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Inspect Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setConfirmPermanentItem(item);
                        setPurgeReason(item.deleteReason || '');
                      }}
                      disabled={isDeleting || isRestoring}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition disabled:opacity-50"
                      title="Security Purge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleRestore(item)}
                      disabled={isRestoring || isDeleting}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                      <span>{isRestoring ? 'Restoring' : 'Restore'}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Title & Context</th>
                  <th className="py-3 px-4">Deleted By</th>
                  <th className="py-3 px-4">Deleted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {items.map((item) => {
                  const style = getTypeStyle(item.itemType);
                  const isRestoring = restoringId === item.id;
                  const isDeleting = deletingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${style.bg}`}>
                          {style.icon}
                          <span>{style.name}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 cursor-pointer" onClick={() => openDetail(item)}>
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {item.subtitle}
                          </div>
                        )}
                        {item.deleteReason && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                            <ShieldAlert className="w-3 h-3 shrink-0 text-amber-500" />
                            <span className="truncate">Reason: {item.deleteReason}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.deletedBy?.name || 'Partner'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {new Date(item.deletedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetail(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmPermanentItem(item);
                              setPurgeReason(item.deleteReason || '');
                            }}
                            disabled={isDeleting || isRestoring}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Security Purge"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={isRestoring || isDeleting}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                            <span>{isRestoring ? 'Restoring' : 'Restore'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deep Detail Modal */}
      <TrashDetailModal
        item={selectedItem}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedItem(null);
        }}
        onRestore={handleRestore}
        onPermanentDelete={(item) => {
          setConfirmPermanentItem(item);
          setPurgeReason(item.deleteReason || '');
        }}
        onUpdateReason={(item, newReason) => {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, deleteReason: newReason } : i))
          );
        }}
        isRestoring={restoringId === selectedItem?.id}
        isDeleting={deletingId === selectedItem?.id}
      />

      {/* Confirmation Modal: Security Purge Authorization Single Item */}
      {confirmPermanentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-red-500/30 p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3.5 text-red-500">
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 shrink-0 shadow-lg shadow-red-500/10">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 inline-block mb-1">
                  High-Security Protocol
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Security Purge Authorization
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Permanent eradication of encrypted records and snapshots
                </p>
              </div>
            </div>

            {/* Target Item Brief */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="truncate">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Record</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{confirmPermanentItem.title}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                {confirmPermanentItem.itemType}
              </span>
            </div>

            {/* Warning Box */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-red-500/5 p-3.5 rounded-2xl border border-red-500/15">
              ⚠️ <strong>Irreversible Deletion:</strong> This snapshot will be permanently purged from PostgreSQL and cannot be restored. An immutable security telemetry event will be recorded in the system audit log.
            </p>

            {/* Reason Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Authorization / Purge Reason <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Audit Compliance</span>
              </label>
              
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[
                  'Duplicate entry',
                  'Sensitive credentials',
                  'Partner authorized',
                  'Obsolete data',
                  'Test record',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPurgeReason(preset)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                      purgeReason === preset
                        ? 'bg-red-500/15 border-red-500 text-red-500 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                value={purgeReason}
                onChange={(e) => setPurgeReason(e.target.value)}
                placeholder="Enter mandatory reason or justification for permanent eradication..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setConfirmPermanentItem(null);
                  setPurgeReason('');
                }}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmPermanentItem, purgeReason)}
                disabled={isActionLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-red-500/25 disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                {isActionLoading ? 'Purging...' : 'Authorize & Permanently Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty Trash with Security Reason */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-red-500/30 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start gap-3.5 text-red-500">
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 shrink-0 shadow-lg shadow-red-500/10">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 inline-block mb-1">
                  Bulk Security Purge
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Empty {selectedType !== 'ALL' ? selectedType.replace(/_/g, ' ') : 'All Trash'}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Irreversible eradication of multiple records
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-red-500/5 p-3.5 rounded-2xl border border-red-500/15">
              ⚠️ <strong>Warning:</strong> This will permanently delete all {selectedType !== 'ALL' ? `${selectedType} ` : ''}snapshots. None of these items can be recovered.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Purge Justification / Authorization Note
              </label>
              <textarea
                value={emptyTrashReason}
                onChange={(e) => setEmptyTrashReason(e.target.value)}
                placeholder="Enter audit reason for emptying trash..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setConfirmEmptyTrash(false);
                  setEmptyTrashReason('');
                }}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={isActionLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-red-500/25 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isActionLoading ? 'Emptying...' : 'Authorize Bulk Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

