import React, { useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ReauthModal } from '../Modals/ReauthModal';
import { SecuritySirenAlertModal } from '../Modals/SecuritySirenAlertModal';
import { PartnerNoteOnLoginModal } from '../Modals/PartnerNoteOnLoginModal';
import { PartnerBreachAlertModal } from '../Modals/PartnerBreachAlertModal';
import { getSocket } from '../../services/socket';
import { triggerSecuritySiren, clearToast, toggleMobileSidebar } from '../../store/slices/uiSlice';
import { addLiveNotification, fetchNotifications } from '../../store/slices/notificationSlice';
import { fetchSharedNotes } from '../../store/slices/sharedNotesSlice';
import { fetchPartnerStatus } from '../../store/slices/authSlice';
import {
  fetchUnreadChatCount,
  incrementUnreadCount,
  updateReadReceipts,
} from '../../store/slices/chatSlice';
import { SecurityAlert } from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  FolderKanban,
  Receipt,
  KeyRound,
  ShieldAlert,
  Menu,
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const token = useSelector((state: RootState) => state.auth.token);
  const activeToast = useSelector((state: RootState) => state.ui.activeToast);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    if (!socket) return;

    socket.on('security_alert', (alert: SecurityAlert) => {
      console.warn('🚨 RECEIVED SECURITY ALERT VIA WEBSOCKET:', alert);
      dispatch(triggerSecuritySiren(alert));
      dispatch(
        addLiveNotification({
          id: alert.alertId || Date.now().toString(),
          title: `CRITICAL ALERT: ${alert.noteTitle}`,
          message: alert.message,
          type: 'SECURITY_ALERT',
          isRead: false,
          metadata: alert.metadata || {},
          createdAt: alert.timestamp || new Date().toISOString(),
        })
      );
    });

    socket.on('new_message', () => {
      if (!window.location.pathname.includes('/messages')) {
        dispatch(incrementUnreadCount());
      }
    });

    socket.on('messages_read', (readData: any) => {
      dispatch(updateReadReceipts(readData));
    });

    dispatch(fetchPartnerStatus());
    dispatch(fetchNotifications());
    dispatch(fetchSharedNotes());
    dispatch(fetchUnreadChatCount());

    const interval = setInterval(() => {
      dispatch(fetchPartnerStatus());
      dispatch(fetchUnreadChatCount());
    }, 15000);

    return () => {
      clearInterval(interval);
      socket.off('security_alert');
      socket.off('new_message');
      socket.off('messages_read');
    };
  }, [token, dispatch]);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        dispatch(clearToast());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeToast, dispatch]);

  interface MobileNavItem {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isAlert?: boolean;
    badge?: number;
  }

  const mobileNavItems: MobileNavItem[] = [
    { to: '/works', label: 'Works', icon: FolderKanban },
    { to: '/payments', label: 'Payments', icon: Receipt },
    { to: '/passwords', label: 'Vault', icon: KeyRound },
    { to: '/secret-notes', label: 'Emergency', icon: ShieldAlert, isAlert: true },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-28 md:pb-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (md:hidden) */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl transition-all"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
        >
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? item.isAlert
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <div
                    className={`p-1.5 rounded-xl transition-all ${
                      isActive
                        ? item.isAlert
                          ? 'bg-red-50 dark:bg-red-950/60 shadow-xs'
                          : 'bg-blue-50 dark:bg-blue-950/60 shadow-xs'
                        : 'bg-transparent'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-slate-950 animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate max-w-[56px]">
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* More Menu Toggle Button */}
          <button
            type="button"
            onClick={() => dispatch(toggleMobileSidebar())}
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all"
            title="Open Full Menu"
          >
            <div className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Menu</span>
          </button>
        </nav>
      </div>

      <ReauthModal />
      <SecuritySirenAlertModal />
      <PartnerNoteOnLoginModal />
      <PartnerBreachAlertModal />

      {activeToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-medium ${
              activeToast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/50'
                : activeToast.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/90 text-red-800 dark:text-red-200 border-red-300 dark:border-red-500/50'
                : activeToast.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/90 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-500/50'
                : 'bg-blue-50 dark:bg-blue-950/90 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-500/50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {activeToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              {activeToast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
              {activeToast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
              {activeToast.type === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              <span className="truncate">{activeToast.message}</span>
            </div>
            <button onClick={() => dispatch(clearToast())} className="p-1 hover:opacity-75 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
