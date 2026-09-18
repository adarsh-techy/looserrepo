import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { api } from '../../services/api';
import { sirenAudio } from '../../services/sirenAudio';
import {
  ShieldAlert,
  Clock,
  Globe,
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface BreachAlertItem {
  id: string;
  title: string;
  message: string;
  type: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export const PartnerBreachAlertModal: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const isSirenMuted = useSelector((state: RootState) => state.ui.isSirenMuted);

  const [alerts, setAlerts] = useState<BreachAlertItem[]>([]);
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isMuted, setIsMuted] = useState(isSirenMuted);

  // Fetch unacknowledged partner breach alerts on mount / login
  const fetchBreachAlerts = async () => {
    if (!user) return;
    try {
      const data = await api.get<BreachAlertItem[]>('/audit-logs/partner-breach-alerts');
      if (Array.isArray(data) && data.length > 0) {
        setAlerts(data);
        if (!isMuted) {
          sirenAudio.playSiren(6);
        }
      }
    } catch (e) {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchBreachAlerts();
    // Also re-check periodically every 30 seconds
    const interval = setInterval(fetchBreachAlerts, 30000);
    return () => {
      clearInterval(interval);
      sirenAudio.stop();
    };
  }, [user]);

  if (alerts.length === 0) return null;

  const currentAlert = alerts[currentAlertIndex] || alerts[0];
  const metadata = currentAlert.metadata || {};
  const actorRole = metadata.actorRole || (user?.role === 'AD' ? 'NS' : 'AD');
  const actorName = metadata.actorName || (user?.role === 'AD' ? 'Vishnu (NS)' : 'Adarsh (AD)');
  const ipAddress = metadata.ipAddress || '127.0.0.1';
  const hoursSinceActive = metadata.hoursSinceActive ?? 0;

  const handleAcknowledge = async () => {
    try {
      setIsDismissing(true);
      sirenAudio.stop();
      await api.post('/audit-logs/acknowledge-breach-alert', { notificationId: currentAlert.id });
      
      const nextAlerts = alerts.filter((_, idx) => idx !== currentAlertIndex);
      setAlerts(nextAlerts);
      setCurrentAlertIndex(0);
    } catch (e) {
      // Non-blocking fallback
      setAlerts((prev) => prev.filter((_, idx) => idx !== currentAlertIndex));
    } finally {
      setIsDismissing(false);
    }
  };

  const handleToggleSound = () => {
    if (isMuted) {
      setIsMuted(false);
      sirenAudio.playSiren(8);
    } else {
      setIsMuted(true);
      sirenAudio.stop();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-2xl animate-fade-in select-none">
      {/* Repeatedly blinking / pulsing alert card in center of screen */}
      <div className="bg-slate-950 border-2 border-red-500 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-[0_0_60px_rgba(239,68,68,0.45)] space-y-5 text-center text-white relative overflow-hidden animate-pulse ring-4 ring-red-500/30 my-auto">
        {/* Ambient Red Alert Glow */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge & Siren Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500/60 text-red-300 text-[10px] font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>UNAUTHORIZED ACCESS ATTEMPT DETECTED</span>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            className="p-1.5 rounded-lg bg-red-950/70 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition text-xs flex items-center gap-1"
            title={isMuted ? 'Unmute siren' : 'Silence siren'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
          </button>
        </div>

        {/* Center Flashing Beacon Icon */}
        <div className="relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-red-600/50 ring-4 ring-red-400/40">
            <ShieldAlert className="w-9 h-9 sm:w-11 sm:h-11 animate-pulse" />
          </div>
        </div>

        {/* Title & Warning Text */}
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            Partner {actorName} Attempted to Access Your Secret Notes!
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed max-w-md mx-auto">
            While you were alive and logged in within the last 2 days ({hoursSinceActive}h ago), an unauthorized attempt was made to enter your emergency vault.
          </p>
        </div>

        {/* Protection Status Banner */}
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-3 flex items-center gap-2.5 text-left text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-relaxed">
            <strong className="text-emerald-300 block">Access Blocked & Vault 100% Encrypted:</strong>
            <span className="text-slate-300">
              The Dead Man&apos;s Switch protocol successfully blocked the entry because your active login was verified within the 48-hour threshold.
            </span>
          </div>
        </div>

        {/* Telemetry Card */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Actor / Requester:</span>
            </span>
            <strong className="text-white font-bold">{actorName} ({actorRole})</strong>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Attempt Timestamp:</span>
            </span>
            <span className="text-slate-200">
              {new Date(currentAlert.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Intruder IP:</span>
            </span>
            <span className="text-slate-200">{ipAddress}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5 text-[11px]">
            <span className="text-slate-400">Security Rule Enforced:</span>
            <span className="text-rose-400 font-bold">Inactivity &lt; 48h (Active Check-in Valid)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isDismissing}
            onClick={handleAcknowledge}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-red-600/40 transition active:scale-98 flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isDismissing ? 'Acknowledging...' : 'I Acknowledge This Security Alert'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleAcknowledge();
              navigate('/audit-log');
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Inspect Incident in Security Audit Trail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
