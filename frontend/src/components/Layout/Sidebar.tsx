import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { setMobileSidebarOpen, openSignOutModal } from '../../store/slices/uiSlice';
import {
  Briefcase,
  FolderKanban,
  Compass,
  KeyRound,
  ShieldAlert,
  ScrollText,
  Users,
  Bell,
  StickyNote,
  CalendarDays,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  X,
  FileKey,
  Receipt,
  Wallet,
  Trash2,
  HeartPulse,
  CreditCard,
  LockKeyhole,
} from 'lucide-react';

import { hasPageAccess } from '../../utils/permissions';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  isSecretNotes?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const isMobileSidebarOpen = useSelector((state: RootState) => state.ui.isMobileSidebarOpen);
  const isSecretNotesVisible = useSelector((state: RootState) => state.ui.isSecretNotesVisible);
  const unreadCount = useSelector((state: RootState) =>
    state.notifications.notifications.filter(n => !n.isRead).length
  );
  const unreadSharedCount = useSelector((state: RootState) =>
    state.sharedNotes.notes.filter(n => !n.isRead).length
  );

  const rawNavSections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { to: '/works', label: 'Works', icon: FolderKanban },
        { to: '/day-to-day', label: 'Day to Day', icon: CalendarDays },
        { to: '/future-plans', label: 'Future Plans', icon: Compass },
        { to: '/business', label: 'Business', icon: Briefcase },
        { to: '/health', label: 'Health', icon: HeartPulse },
      ],
    },
    {
      title: 'Finance & Accounts',
      items: [
        { to: '/money-management', label: 'Money Management', icon: Wallet },
        { to: '/payments', label: 'Payments & ITR', icon: Receipt },
      ],
    },
    {
      title: 'Communication & Notes',
      items: [
        { to: '/reminders-notes', label: 'Reminders & Notes', icon: StickyNote, count: unreadSharedCount },
        { to: '/notifications', label: 'Notifications', icon: Bell, count: unreadCount },
      ],
    },
    {
      title: 'Security & Vault',
      items: [
        { to: '/passwords', label: 'Passwords', icon: KeyRound },
        { to: '/personal-passwords', label: 'Personal Passwords', icon: LockKeyhole },
        { to: '/documents', label: 'Documents & Cards', icon: CreditCard },
        ...(isSecretNotesVisible
          ? [
              { to: '/secret-notes', label: 'Secret Notes', icon: ShieldAlert, isSecretNotes: true },
              { to: '/my-secret-notes', label: 'My Secret Notes', icon: FileKey },
            ]
          : []),
      ],
    },
    {
      title: 'System & Archive',
      items: [
        { to: '/trash', label: 'Recycle Bin / Trash', icon: Trash2 },
        { to: '/audit-log', label: 'Audit Log', icon: ScrollText },
        { to: '/users', label: 'Users & Access', icon: Users },
      ],
    },
  ];


  // Filter accessible nav items based on user's page permissions (AD has access to all)
  const navSections = rawNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPageAccess(user, item.to)),
    }))
    .filter((section) => section.items.length > 0);

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Brand Header */}
      <div
        className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0"
        style={isMobile ? { paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' } : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
              Loosers
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">Dual-Partner Enclave</p>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={() => dispatch(setMobileSidebarOpen(false))}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isSecret = (item as any).isSecretNotes;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (isMobile) dispatch(setMobileSidebarOpen(false));
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group touch-manipulation ${
                      isActive
                        ? isSecret
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 font-bold'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                        : isSecret
                        ? 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isSecret ? 'text-red-500 group-hover:text-red-600' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold shadow-xs">
                      {item.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Profile & Logout Bottom Card */}
      <div
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shrink-0"
        style={isMobile ? { paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' } : undefined}
      >
        {/* Dummy Sign Out button (Text) with secret 3-click unhide trigger */}
        <button
          type="button"
          onClick={() => dispatch(openSignOutModal())}
          className="flex items-center gap-2.5 w-full px-3 py-2 mb-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100/90 dark:hover:bg-red-900/60 border border-red-200/80 dark:border-red-900/60 transition cursor-pointer active:scale-98 shadow-xs"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>Sign Out</span>
        </button>

        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="text-left text-xs min-w-0">
              <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">{user?.email}</div>
            </div>
          </div>

          {/* Real Logout button */}
          <button
            onClick={() => dispatch(logout())}
            title="Sign Out"
            className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/80 rounded-xl border border-red-200 dark:border-red-900/60 transition shrink-0 touch-manipulation cursor-pointer shadow-xs active:scale-95"
          >
            <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 h-screen sticky top-0 z-30 transition-colors duration-200">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => dispatch(setMobileSidebarOpen(false))}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] h-[100dvh] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  );
};
