import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from '../store/slices/notificationSlice';
import {
  Bell,
  ShieldAlert,
  Info,
  Trash2,
  Clock,
  MailCheck,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications } = useSelector((state: RootState) => state.notifications);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Security alerts, emergency access updates, and partner notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch(markAllNotificationsRead())}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 dark:border-slate-700"
          >
            <MailCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
          <button
            onClick={() => dispatch(clearAllNotifications())}
            className="px-3 py-2 bg-red-500/10 dark:bg-red-600/20 hover:bg-red-500/20 dark:hover:bg-red-600/30 text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-sm dark:shadow-none">
          <Bell className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Notifications</h3>
          <p className="text-xs text-slate-500">You're completely up to date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => dispatch(markNotificationRead(n.id))}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 cursor-pointer shadow-sm ${
                n.isRead
                  ? 'bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/60'
                  : 'bg-white dark:bg-slate-900 border-blue-400 dark:border-blue-500/40 shadow-md ring-1 ring-blue-500/20'
              } ${n.type === 'SECURITY_ALERT' ? 'border-red-400 dark:border-red-500/50 bg-red-50/50 dark:bg-red-950/20' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl mt-0.5 ${
                    n.type === 'SECURITY_ALERT'
                      ? 'bg-red-500/15 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                      : n.type === 'WARNING'
                      ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {n.type === 'SECURITY_ALERT' ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Info className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                  <h4 className={`text-sm font-bold ${n.isRead ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{n.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono pt-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
