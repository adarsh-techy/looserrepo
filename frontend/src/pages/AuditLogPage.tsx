import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAuditLogs, fetchMoreAuditLogs } from '../store/slices/auditLogSlice';
import { AuditLog } from '../types';
import {
  ScrollText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  ArrowDown,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  LogIn,
  LogOut,
  CreditCard,
  FileText,
  Unlock,
  Trash2,
  Edit3,
  Globe,
  User,
  Clock,
} from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { logs, isLoading, isLoadingMore, hasMore, page } = useSelector((state: RootState) => state.auditLogs);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileScrollContainerRef = useRef<HTMLDivElement>(null);

  // Initial fetch on search / severity change
  useEffect(() => {
    dispatch(
      fetchAuditLogs({
        search: search.trim() || undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        page: 1,
        limit: 20,
      })
    );
  }, [dispatch, search, severityFilter]);

  // Lazy loading scroll handler for inside table scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 80) {
      if (!isLoading && !isLoadingMore && hasMore) {
        dispatch(
          fetchMoreAuditLogs({
            search: search.trim() || undefined,
            severity: severityFilter !== 'ALL' ? severityFilter : undefined,
            page: page + 1,
            limit: 20,
          })
        );
      }
    }
  };

  const handleRefresh = () => {
    dispatch(
      fetchAuditLogs({
        search: search.trim() || undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        page: 1,
        limit: 20,
      })
    );
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'ALERT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm shadow-red-600/30 animate-pulse whitespace-nowrap">
            <Flame className="w-3 h-3" />
            <span>SIREN ALERT</span>
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" />
            <span>CRITICAL</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-900 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" />
            <span>WARNING</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-900 whitespace-nowrap">
            <Info className="w-3 h-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  // Convert raw system event codes into human-friendly badges with icons & clear colors
  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'EMERGENCY_ACCESS_CHEAT_BLOCKED':
        return {
          title: 'Unauthorized Vault Access Blocked',
          icon: ShieldAlert,
          className: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800',
        };
      case 'EMERGENCY_ACCESS_REQUEST':
        return {
          title: 'Emergency Access Requested',
          icon: AlertTriangle,
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        };
      case 'AUTH_LOGIN':
      case 'USER_LOGIN':
      case 'LOGIN':
        return {
          title: 'Partner Logged In',
          icon: LogIn,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        };
      case 'AUTH_LOGOUT':
      case 'LOGOUT':
        return {
          title: 'Partner Logged Out',
          icon: LogOut,
          className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        };
      case 'AUTH_PASSWORD_CHANGE':
      case 'PASSWORD_CHANGE':
        return {
          title: 'Password Changed',
          icon: KeyRound,
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
        };
      case 'AUTH_2FA_ENABLE':
        return {
          title: '2FA Security Enabled',
          icon: ShieldCheck,
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'AUTH_2FA_DISABLE':
        return {
          title: '2FA Security Disabled',
          icon: ShieldAlert,
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      case 'SECRET_NOTE_CREATE':
        return {
          title: 'Secret Note Created',
          icon: FileText,
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        };
      case 'SECRET_NOTE_UNLOCK':
        return {
          title: 'Secret Note Unlocked',
          icon: Unlock,
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'SECRET_NOTE_DELETE':
        return {
          title: 'Secret Note Deleted',
          icon: Trash2,
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      case 'PAYMENT_CREATE':
        return {
          title: 'Payment Recorded',
          icon: CreditCard,
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'PAYMENT_UPDATE':
        return {
          title: 'Payment Updated',
          icon: Edit3,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        };
      case 'PAYMENT_DELETE':
        return {
          title: 'Payment Deleted',
          icon: Trash2,
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      case 'VAULT_ITEM_CREATE':
      case 'VAULT_CREATE':
        return {
          title: 'Vault Item Saved',
          icon: Lock,
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
        };
      case 'VAULT_ITEM_DELETE':
      case 'VAULT_DELETE':
        return {
          title: 'Vault Item Deleted',
          icon: Trash2,
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      case 'FUTURE_PLAN_CREATE':
        return {
          title: 'Future Plan Added',
          icon: Sparkles,
          className: 'bg-pink-100 text-pink-800 dark:bg-pink-950/70 dark:text-pink-300 border-pink-300 dark:border-pink-800',
        };
      case 'TASK_CREATE':
        return {
          title: 'Task Created',
          icon: CheckCircle2,
          className: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800',
        };
      default:
        return {
          title: eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: Shield,
          className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        };
    }
  };

  // Convert actor emails/roles into clean human partner pills (AD vs NS)
  const renderActorPill = (log: AuditLog) => {
    const actorStr = `${log.actor?.name || ''} ${log.actorEmail || ''} ${log.metadata?.actorRole || ''} ${log.metadata?.actorName || ''}`.toLowerCase();
    
    if (actorStr.includes('adarsh') || actorStr.includes('ad@') || actorStr.includes(' ad ') || log.metadata?.actorRole === 'AD') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 text-xs font-bold whitespace-nowrap">
          <span>👑</span>
          <span>AD (Adarsh)</span>
        </span>
      );
    }

    if (actorStr.includes('ns') || actorStr.includes('partner') || log.metadata?.actorRole === 'NS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 text-xs font-bold whitespace-nowrap">
          <span>🛡️</span>
          <span>NS (Partner)</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold whitespace-nowrap">
        <User className="w-3.5 h-3.5 text-slate-500" />
        <span>{log.actorEmail || 'System Automated'}</span>
      </span>
    );
  };

  // Render easy-to-understand plain English action description instead of raw JSON
  const renderEasyDescription = (log: AuditLog) => {
    const meta = log.metadata || {};

    if (log.eventType === 'EMERGENCY_ACCESS_CHEAT_BLOCKED') {
      const partner = meta.partnerName || 'Partner';
      const hours = meta.hoursSinceActive ?? 0;
      return (
        <div className="space-y-1">
          <p className="font-semibold text-red-600 dark:text-red-400">
            🚨 Blocked unauthorized secret note access: {partner} is ALIVE & logged in {hours}h ago.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Intrusion stopped immediately. High-decibel siren alarm triggered.
          </p>
        </div>
      );
    }

    if (meta.alertMessage) {
      return <span className="font-medium text-slate-800 dark:text-slate-200">{meta.alertMessage}</span>;
    }

    if (log.eventType === 'PAYMENT_CREATE') {
      return (
        <div className="space-y-0.5">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            New payment entry recorded: <strong>₹{meta.amount || 0}</strong>
          </span>
          {meta.clientName && (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Paid by: <strong>{meta.clientName}</strong> {meta.title ? `(${meta.title})` : ''}
            </span>
          )}
        </div>
      );
    }

    if (log.eventType === 'PAYMENT_DELETE') {
      return <span className="text-slate-600 dark:text-slate-300">Payment record #{log.targetId?.slice(0, 8) || ''} moved to trash.</span>;
    }

    if (log.eventType.includes('LOGIN')) {
      return (
        <span className="text-slate-700 dark:text-slate-300">
          Successful partner portal authentication session established.
        </span>
      );
    }

    if (log.eventType.includes('PASSWORD_CHANGE')) {
      return <span className="text-slate-700 dark:text-slate-300">Account security password updated successfully.</span>;
    }

    if (log.eventType.includes('SECRET_NOTE')) {
      return (
        <span className="text-slate-700 dark:text-slate-300">
          {meta.title ? `Note title: "${meta.title}"` : 'Emergency Secret Note record modified.'}
        </span>
      );
    }

    if (meta.title || meta.name) {
      return (
        <span className="text-slate-700 dark:text-slate-300">
          Item: <strong>{meta.title || meta.name}</strong>
        </span>
      );
    }

    return (
      <span className="text-slate-600 dark:text-slate-400">
        Action completed on {log.targetType || 'system resource'}.
      </span>
    );
  };

  return (
    <div className="space-y-5 flex flex-col h-[calc(100vh-120px)] min-h-[550px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Security Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographic ledger tracking all partner logins, vault operations, payments, and security alert events.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>{logs.length} Events Logged</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search activities, partner AD/NS, IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['ALL', 'ALERT', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-12 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading security audit records...</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-sm">
          <div className="space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Audit Events Found</h3>
            <p className="text-xs text-slate-500">Security audit ledger is clean for current filters.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile Card List with Inside Scroll & Lazy Loading */}
          <div
            ref={mobileScrollContainerRef}
            onScroll={handleScroll}
            className="block md:hidden flex-1 overflow-y-auto space-y-3 pr-1"
          >
            {logs.map((log) => {
              const badge = getEventBadge(log.eventType);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm active:scale-[0.99] space-y-3 ${
                    log.severity === 'ALERT'
                      ? 'bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800/60'
                      : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getSeverityBadge(log.severity)}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${badge.className}`}>
                        <BadgeIcon className="w-3 h-3 shrink-0" />
                        <span>{badge.title}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-xs">{renderEasyDescription(log)}</div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>{renderActorPill(log)}</div>
                    {log.ipAddress && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{log.ipAddress}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Mobile Lazy Loading Indicator */}
            {isLoadingMore && (
              <div className="p-3 text-center bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading more records...</span>
              </div>
            )}

            {!hasMore && logs.length > 0 && (
              <div className="p-3 text-center text-[11px] text-slate-400 font-mono">
                ✓ All {logs.length} audit records loaded
              </div>
            )}
          </div>

          {/* Desktop Table View with INSIDE SCROLL & Sticky Header */}
          <div className="hidden md:flex flex-col flex-1 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden min-h-0">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overflow-x-auto relative"
            >
              <table className="w-full text-left text-xs border-collapse">
                {/* Sticky Header */}
                <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200 dark:border-slate-800 shadow-xs">
                  <tr>
                    <th className="py-3.5 px-4 w-28">Severity</th>
                    <th className="py-3.5 px-4 w-60">Event / Activity</th>
                    <th className="py-3.5 px-4">Action Details & Summary</th>
                    <th className="py-3.5 px-4 w-40">Actor</th>
                    <th className="py-3.5 px-4 w-32">IP Address</th>
                    <th className="py-3.5 px-4 text-right w-44">Date & Time</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {logs.map((log) => {
                    const badge = getEventBadge(log.eventType);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition ${
                          log.severity === 'ALERT' ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                        }`}
                      >
                        {/* Severity */}
                        <td className="py-3.5 px-4 shrink-0">{getSeverityBadge(log.severity)}</td>

                        {/* Event / Activity */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${badge.className}`}>
                            <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{badge.title}</span>
                          </span>
                        </td>

                        {/* Action Details & Plain English Summary */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {renderEasyDescription(log)}
                        </td>

                        {/* Actor (👑 AD / 🛡️ NS) */}
                        <td className="py-3.5 px-4 shrink-0">{renderActorPill(log)}</td>

                        {/* IP Address */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{log.ipAddress || '127.0.0.1'}</span>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] text-right whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Lazy Loading Indicator Row */}
                  {isLoadingMore && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center bg-blue-50/30 dark:bg-blue-950/20">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-900 shadow-sm animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading more records...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* End of Ledger */}
                  {!hasMore && logs.length > 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-[11px] text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-950/30">
                        ✓ All {logs.length} immutable audit records loaded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Status */}
            <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tamper-evident append-only cryptographic ledger • Click any row for details</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Scroll inside table for auto-load</span>
                {hasMore && <ArrowDown className="w-3 h-3 text-blue-500 animate-bounce" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Log Inspection Modal */}
      {selectedLog && (() => {
        const badge = getEventBadge(selectedLog.eventType);
        const BadgeIcon = badge.icon;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border ${badge.className}`}>
                    <BadgeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{badge.title}</h3>
                    <p className="text-[11px] text-slate-500">Security Ledger Event #{selectedLog.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 text-xs">
                {/* Summary Box */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    What Happened:
                  </span>
                  <div>{renderEasyDescription(selectedLog)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Severity</span>
                    <div>{getSeverityBadge(selectedLog.severity)}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Actor / User</span>
                    <div>{renderActorPill(selectedLog)}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <span>IP Address:</span>
                    </span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedLog.ipAddress || '127.0.0.1'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Timestamp:</span>
                    </span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </strong>
                  </div>

                  {selectedLog.targetType && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Resource:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {selectedLog.targetType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Event Technical Metadata (collapsible/neat) */}
                <div>
                  <span className="block mb-1 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    Technical Event Details:
                  </span>
                  <pre className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto text-[11px] leading-relaxed max-h-36">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>

                <div className="flex items-center gap-2 text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Immutable audit entry. Zero secret note text or passwords recorded.</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

