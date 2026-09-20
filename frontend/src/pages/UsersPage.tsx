import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchPartnerStatus } from '../store/slices/authSlice';
import { showToast } from '../store/slices/uiSlice';
import { TwoFactorSetupModal } from '../components/Modals/TwoFactorSetupModal';
import { api } from '../services/api';
import { APP_PAGES, AppPageDef } from '../utils/permissions';
import {
  Users,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Trash2,
  Check,
  X,
  Crown,
  Loader2,
  ArrowLeft,
  Search,
  Key,
  ShieldAlert,
  Briefcase,
  CalendarDays,
  Compass,
  Lightbulb,
  HeartPulse,
  DollarSign,
  Receipt,
  StickyNote,
  Bell,
  CreditCard,
  FileKey,
  ScrollText,
  LockKeyhole,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  totpEnabled: boolean;
  pagePermissions?: string[];
  lastLogin?: string;
  lastCheckIn?: string;
  createdAt: string;
}

// Icon mapping matching sidebar navigation
const PAGE_ICON_MAP: Record<string, React.ElementType> = {
  '/works': Briefcase,
  '/day-to-day': CalendarDays,
  '/future-plans': Compass,
  '/business': Lightbulb,
  '/health': HeartPulse,
  '/money-management': DollarSign,
  '/payments': Receipt,
  '/reminders-notes': StickyNote,
  '/notifications': Bell,
  '/passwords': KeyRound,
  '/personal-passwords': LockKeyhole,
  '/documents': CreditCard,
  '/secret-notes': ShieldAlert,
  '/my-secret-notes': FileKey,
  '/trash': Trash2,
  '/audit-log': ScrollText,
  '/users': Users,
};

export const UsersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const partnerStatus = useSelector((state: RootState) => state.auth.partnerStatus);

  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 2FA Modal
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  // Change My Password Modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Admin Reset User Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<ManagedUser | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [isAdminResettingPassword, setIsAdminResettingPassword] = useState(false);

  // Manage Access Checkbox Switchboard Modal
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<ManagedUser | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Create User Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'NS' | 'AD'>('NS');
  const [newUserPerms, setNewUserPerms] = useState<string[]>(
    APP_PAGES.map((p) => p.path)
  );
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const isAD = currentUser?.role === 'AD';

  const loadUsers = async () => {
    if (!isAD) return;
    setIsLoadingUsers(true);
    try {
      const res = await api.get<ManagedUser[]>('/users');
      setAllUsers(Array.isArray(res) ? res : []);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to load user accounts', type: 'error' }));
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    dispatch(fetchPartnerStatus());
    if (isAD) {
      loadUsers();
    }
  }, [dispatch, isAD]);

  // Disable 2FA
  const handleDisable2FA = async () => {
    const pwd = prompt('Enter your account password to disable 2FA:');
    if (pwd) {
      try {
        await api.post('/auth/2fa/disable', { password: pwd });
        dispatch(showToast({ message: '2FA has been disabled', type: 'warning' }));
        window.location.reload();
      } catch (err: any) {
        dispatch(showToast({ message: err.message || 'Failed to disable 2FA', type: 'error' }));
      }
    }
  };

  // Change My Password Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput || !newPasswordInput) {
      dispatch(showToast({ message: 'Please enter current and new password', type: 'warning' }));
      return;
    }
    if (newPasswordInput.length < 6) {
      dispatch(showToast({ message: 'New password must be at least 6 characters long', type: 'warning' }));
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      dispatch(showToast({ message: 'New passwords do not match', type: 'warning' }));
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPasswordInput,
        newPassword: newPasswordInput,
      });

      dispatch(
        showToast({
          message: 'Password updated successfully! Log in with your new password.',
          type: 'success',
        })
      );
      setIsChangePasswordModalOpen(false);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to change password', type: 'error' }));
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Admin Direct Reset Password for Partner
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!adminNewPassword || adminNewPassword.length < 6) {
      dispatch(showToast({ message: 'New password must be at least 6 characters long', type: 'warning' }));
      return;
    }

    setIsAdminResettingPassword(true);
    try {
      await api.patch(`/users/${resetTargetUser.id}/password`, {
        newPassword: adminNewPassword,
      });
      dispatch(
        showToast({
          message: `Password for "${resetTargetUser.name}" has been updated successfully!`,
          type: 'success',
        })
      );
      setResetTargetUser(null);
      setAdminNewPassword('');
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to reset user password', type: 'error' }));
    } finally {
      setIsAdminResettingPassword(false);
    }
  };

  // Open Manage Access Switchboard Modal
  const handleOpenPermsModal = (userToEdit: ManagedUser) => {
    setSelectedUserForPerms(userToEdit);
    const existingPerms = userToEdit.pagePermissions || [];
    if (userToEdit.role === 'AD' || existingPerms.includes('*')) {
      setSelectedPerms(APP_PAGES.map((p) => p.path));
    } else {
      setSelectedPerms([...existingPerms]);
    }
  };

  // Toggle Page in Switchboard
  const handleTogglePermCheckbox = (path: string) => {
    if (selectedPerms.includes(path)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== path));
    } else {
      setSelectedPerms([...selectedPerms, path]);
    }
  };

  const handleSelectAllPerms = () => {
    setSelectedPerms(APP_PAGES.map((p) => p.path));
  };

  const handleDeselectAllPerms = () => {
    setSelectedPerms([]);
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!selectedUserForPerms) return;
    setIsSavingPerms(true);
    try {
      const res = await api.patch<ManagedUser>(`/users/${selectedUserForPerms.id}/permissions`, {
        pagePermissions: selectedPerms,
      });

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserForPerms.id ? { ...u, pagePermissions: res?.pagePermissions || selectedPerms } : u
        )
      );

      dispatch(
        showToast({
          message: `Sidebar access permissions for "${selectedUserForPerms.name}" saved!`,
          type: 'success',
        })
      );
      setSelectedUserForPerms(null);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to update permissions', type: 'error' }));
    } finally {
      setIsSavingPerms(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      dispatch(showToast({ message: 'Please fill in name, email, and temporary password', type: 'warning' }));
      return;
    }
    if (newUserPassword.length < 6) {
      dispatch(showToast({ message: 'Password must be at least 6 characters long', type: 'warning' }));
      return;
    }

    setIsCreatingUser(true);
    try {
      const perms = newUserRole === 'AD' ? ['*'] : newUserPerms;
      const res = await api.post<ManagedUser>('/users', {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        pagePermissions: perms,
      });

      dispatch(
        showToast({
          message: `User account "${res?.name || newUserName}" created successfully!`,
          type: 'success',
        })
      );

      setIsCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('NS');
      setNewUserPerms(APP_PAGES.map((p) => p.path));
      loadUsers();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to create user', type: 'error' }));
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userToDelete: ManagedUser) => {
    if (userToDelete.id === currentUser?.id) {
      dispatch(showToast({ message: 'Cannot delete your own account', type: 'error' }));
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${userToDelete.name}" (${userToDelete.email})?`)) {
      return;
    }

    try {
      await api.delete(`/users/${userToDelete.id}`);
      dispatch(showToast({ message: `User "${userToDelete.name}" was deleted.`, type: 'info' }));
      setAllUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to delete user', type: 'error' }));
    }
  };

  // Filtered users for search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return allUsers;
    const q = searchTerm.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [allUsers, searchTerm]);

  // Group pages by category
  const categories: AppPageDef['category'][] = [
    'Workspace',
    'Finance & Accounts',
    'Communication',
    'Security & Vault',
    'System & Audit',
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-16 max-w-6xl mx-auto px-2 sm:px-4">
      {/* 1. CLEAN STREAMLINED PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Users & Access Control
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Manage partner accounts, passwords, and customize sidebar menu permissions.
            </p>
          </div>
        </div>

        {/* Quick Actions in Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Change My Password Button */}
          <button
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>My Password</span>
          </button>

          {/* 2FA Security Button */}
          <button
            onClick={() => (currentUser?.totpEnabled ? handleDisable2FA() : setIs2FAModalOpen(true))}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs transition cursor-pointer border ${
              currentUser?.totpEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>2FA: {currentUser?.totpEnabled ? 'Active' : 'Off'}</span>
          </button>

          {isAD && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs transition cursor-pointer shadow-md shadow-blue-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN USER MANAGEMENT LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search & Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Account Roster</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {filteredUsers.length} accounts
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click &quot;Manage Access&quot; on any partner to toggle their accessible sidebar menus.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 pl-9 pr-8 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* User Cards */}
        {isLoadingUsers ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading user accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No user accounts found matching &quot;{searchTerm}&quot;
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const userIsAD = u.role === 'AD';
              const perms = u.pagePermissions || [];
              const hasAllAccess = userIsAD || perms.includes('*');
              const totalPermittable = APP_PAGES.length;
              const allowedCount = hasAllAccess ? totalPermittable : perms.length;

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border transition-all ${
                    u.id === currentUser?.id
                      ? 'bg-blue-50/30 dark:bg-blue-950/15 border-blue-200 dark:border-blue-900/60'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User Identity & Avatar */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0 ${
                          userIsAD
                            ? 'bg-gradient-to-tr from-amber-600 to-yellow-500'
                            : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                        }`}
                      >
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {u.name}
                          </h4>
                          {u.id === currentUser?.id && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              You
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              userIsAD
                                ? 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            {userIsAD ? <Crown className="w-3 h-3 text-amber-600" /> : <ShieldCheck className="w-3 h-3 text-indigo-600" />}
                            <span>{userIsAD ? 'Super Admin (AD)' : 'Partner (NS)'}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="font-mono text-[11px] truncate">{u.email}</span>
                          {/* Online Indicator */}
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                u.id === currentUser?.id || partnerStatus?.isReachable
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>{u.id === currentUser?.id ? 'Online' : 'Partner'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Permissions Badge & Action Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 shrink-0">
                      {/* Access Status Pill */}
                      <div className="text-left sm:text-right">
                        {userIsAD ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Full Unrestricted Access</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>
                              {allowedCount} of {totalPermittable} Menus Enabled
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Direct Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Manage Access Button */}
                        <button
                          onClick={() => handleOpenPermsModal(u)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                          title="Configure sidebar menu permissions"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Manage Access</span>
                        </button>

                        {/* Reset Password Button (Adarsh can reset partner password directly) */}
                        {isAD && (
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setAdminNewPassword('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                            title="Reset password for this user"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-500" />
                            <span>Reset Pwd</span>
                          </button>
                        )}

                        {/* Delete User */}
                        {isAD && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2FA Setup Modal */}
      {is2FAModalOpen && <TwoFactorSetupModal onClose={() => setIs2FAModalOpen(false)} />}

      {/* ------------------------------------------------------------- */}
      {/* 3. MANAGE ACCESS SWITCHBOARD MODAL (EASY ON/OFF TOGGLE)       */}
      {/* ------------------------------------------------------------- */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl my-auto flex flex-col max-h-[92dvh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Sidebar Menu Access: {selectedUserForPerms.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {selectedUserForPerms.role}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click any card to enable or hide that menu item from the partner&apos;s sidebar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedUserForPerms.role === 'AD' ? (
              <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-2 text-sm">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span>Super Administrator (Role AD)</span>
                </div>
                <p>
                  User <strong>{selectedUserForPerms.name}</strong> holds the <strong>AD</strong> role and has full, unconditional access to all system menus, vaults, and pages.
                </p>
              </div>
            ) : (
              <>
                {/* Quick Batch Toggle Actions */}
                <div className="flex items-center justify-between gap-2 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPerms}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer border border-blue-200 dark:border-blue-900/60 shadow-2xs"
                    >
                      ✓ Enable All Menus
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPerms}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      ✕ Disable All
                    </button>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {selectedPerms.length} Menus Enabled
                  </span>
                </div>

                {/* Categorized Switchboard Cards */}
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                  {categories.map((cat) => {
                    const catPages = APP_PAGES.filter((p) => p.category === cat);
                    if (catPages.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                          {cat}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {catPages.map((page) => {
                            const isEnabled = selectedPerms.includes(page.path);
                            const IconComponent = PAGE_ICON_MAP[page.path] || KeyRound;

                            return (
                              <button
                                key={page.path}
                                type="button"
                                onClick={() => handleTogglePermCheckbox(page.path)}
                                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer select-none ${
                                  isEnabled
                                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600/80 shadow-xs'
                                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-90'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      isEnabled
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}
                                  >
                                    <IconComponent className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                                      {page.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                                      {page.path}
                                    </span>
                                  </div>
                                </div>

                                {/* Modern Switch Pill */}
                                <div
                                  className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ml-2 ${
                                    isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <span className="text-xs text-slate-500 font-mono">
                {selectedPerms.length} Pages Permitted
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPerms(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingPerms}
                  onClick={handleSavePermissions}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSavingPerms ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Menu Access</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. ADMIN RESET PARTNER PASSWORD MODAL                         */}
      {/* ------------------------------------------------------------- */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Reset Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set a new password for <strong>{resetTargetUser.name}</strong> ({resetTargetUser.email}).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdminResettingPassword}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isAdminResettingPassword ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. CHANGE MY PASSWORD MODAL                                    */}
      {/* ------------------------------------------------------------- */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Change My Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update your personal account credentials.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isChangingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. CREATE NEW USER MODAL (ROLE AD ONLY)                        */}
      {/* ------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <form
            onSubmit={handleCreateUser}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add New Account
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create partner account with initial password and role.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vishnu"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@looser.vault"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  System Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole('NS')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                      newUserRole === 'NS'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs block">Role NS</span>
                      <span className="text-[10px] font-normal text-slate-400 block">Managing Partner</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewUserRole('AD')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                      newUserRole === 'AD'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Crown className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs block">Role AD</span>
                      <span className="text-[10px] font-normal text-slate-400 block">Super Administrator</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingUser}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isCreatingUser ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
