import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { setMobileSidebarOpen } from '../../store/slices/uiSlice';
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
        { to: '/secret-notes', label: 'Secret Notes', icon: ShieldAlert, isSecretNotes: true },
        { to: '/my-secret-notes', label: 'My Secret Notes', icon: FileKey },
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
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Looser <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-medium border border-blue-500/20 dark:border-blue-500/30">Vault</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">Dual-Partner Enclave</p>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={() => dispatch(setMobileSidebarOpen(false))}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
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
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
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

          <button
            onClick={() => dispatch(logout())}
            title="Logout"
            className="p-2 text-slate-500 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
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
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  );
};
