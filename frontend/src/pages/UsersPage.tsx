import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchPartnerStatus, updatePreferencesAction } from '../store/slices/authSlice';
import { showToast } from '../store/slices/uiSlice';
import { TwoFactorSetupModal } from '../components/Modals/TwoFactorSetupModal';
import { api } from '../services/api';
import { APP_PAGES, AppPageDef } from '../utils/permissions';
import {
  Users,
  ShieldCheck,
  Volume2,
  QrCode,
  UserPlus,
  KeyRound,
  Trash2,
  Check,
  X,
  Crown,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Search,
  Layers,
  Lock,
  Key,
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

export const UsersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const partnerStatus = useSelector((state: RootState) => state.auth.partnerStatus);

  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 2FA & Preferences
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [sirenPref, setSirenPref] = useState(currentUser?.sirenSoundPref ?? true);

  // Change Password State
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Manage Access Checkbox Modal
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
    APP_PAGES.filter((p) => !p.adminOnly).map((p) => p.path)
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

  const handleToggleSirenPref = async () => {
    const newPref = !sirenPref;
    setSirenPref(newPref);
    await dispatch(updatePreferencesAction({ sirenSoundPref: newPref }));
    dispatch(showToast({ message: `Siren audio preference ${newPref ? 'enabled' : 'disabled'}`, type: 'info' }));
  };

  const handleDisable2FA = async () => {
    const pwd = prompt('Enter your account password to disable 2FA:');
    if (pwd) {
      try {
        await api.post('/auth/2fa/disable', { password: pwd });
        dispatch(showToast({ message: '2FA disabled', type: 'warning' }));
        window.location.reload();
      } catch (err: any) {
        dispatch(showToast({ message: err.message || 'Failed to disable 2FA', type: 'error' }));
      }
    }
  };

  // Change Password Submission
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
          message: 'Password updated successfully! You can now log in with your new password.',
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

  // Open Manage Access Modal
  const handleOpenPermsModal = (userToEdit: ManagedUser) => {
    setSelectedUserForPerms(userToEdit);
    const existingPerms = userToEdit.pagePermissions || [];
    if (userToEdit.role === 'AD' || existingPerms.includes('*')) {
      setSelectedPerms(APP_PAGES.filter((p) => !p.adminOnly).map((p) => p.path));
    } else {
      setSelectedPerms([...existingPerms]);
    }
  };

  // Toggle Page Checkbox in Modal
  const handleTogglePermCheckbox = (path: string) => {
    if (selectedPerms.includes(path)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== path));
    } else {
      setSelectedPerms([...selectedPerms, path]);
    }
  };

  const handleSelectAllPerms = () => {
    setSelectedPerms(APP_PAGES.filter((p) => !p.adminOnly).map((p) => p.path));
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
          message: `Page access permissions for "${selectedUserForPerms.name}" updated successfully!`,
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
          message: `User account "${res?.name || newUserName}" (${newUserRole}) created successfully with temporary password!`,
          type: 'success',
        })
      );

      setIsCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('NS');
      setNewUserPerms(APP_PAGES.filter((p) => !p.adminOnly).map((p) => p.path));
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
    if (!confirm(`Are you sure you want to delete user "${userToDelete.name}" (${userToDelete.email})?`)) {
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

  // Group pages by category for checkbox display
  const categories: AppPageDef['category'][] = [
    'Workspace',
    'Finance & Accounts',
    'Communication',
    'Security & Vault',
    'System & Audit',
  ];

  const superAdminCount = useMemo(() => {
    return allUsers.filter((u) => u.role === 'AD').length;
  }, [allUsers]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-16 max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
      {/* 1. CLEAN & CLASSIC PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/50">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate sm:whitespace-normal">
              Users & Page Access Control
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate sm:whitespace-normal">
              {isAD
                ? 'Super Admin (AD): Create accounts with temporary passwords & configure page permissions.'
                : 'Partner NS: View authorized modules and manage your account credentials & password.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Change My Password Button */}
          <button
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Change Password</span>
          </button>

          {isAD && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs sm:text-sm transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create User</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. EXECUTIVE STAT SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Total Users */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Active Users</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 ml-1">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2 truncate">
            {isAD ? allUsers.length : '2'} <span className="text-xs font-normal text-slate-500">AD & NS</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">Vault partner accounts</p>
        </div>

        {/* Super Admins */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Super Admin</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 ml-1">
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2 truncate">
            {isAD ? superAdminCount : '1'} <span className="text-xs font-normal text-slate-500">Role AD</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">Full system authority</p>
        </div>

        {/* Available Pages */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Page Matrix</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ml-1">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2 truncate">
            {APP_PAGES.length} <span className="text-xs font-normal text-slate-500">Modules</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">5 functional categories</p>
        </div>

        {/* Security / 2FA Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Your 2FA</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 ml-1">
              <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-base sm:text-xl lg:text-2xl font-bold mt-2 truncate ${
              currentUser?.totpEnabled
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {currentUser?.totpEnabled ? 'Active' : 'Unprotected'}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {currentUser?.totpEnabled ? 'TOTP Authenticator' : 'Setup recommended'}
          </p>
        </div>
      </div>

      {/* 3. ADMIN USER MANAGEMENT SECTION */}
      {isAD && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Super Admin (AD) Access & Permissions Manager</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage partner accounts (AD & NS) and assign granular page access. Newly created users receive a temporary password they can change.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user or role..."
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

                return (
                  <div
                    key={u.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                      u.id === currentUser?.id
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 ${
                            userIsAD
                              ? 'bg-amber-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {u.name}
                            </h4>
                            {u.id === currentUser?.id && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                You (Active)
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                userIsAD
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              Role: {u.role} {userIsAD ? '👑 (Super Admin)' : '🛡️ (Partner)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      {/* Page Access Badges & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-2.5">
                        {/* Permissions Summary Badges */}
                        <div className="flex flex-wrap gap-1 items-center max-w-md">
                          {hasAllAccess ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>All Pages Access (Full System Access)</span>
                            </span>
                          ) : perms.length > 0 ? (
                            <>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                                Permitted:
                              </span>
                              {perms.slice(0, 3).map((pPath) => {
                                const pageDef = APP_PAGES.find((p) => p.path === pPath || p.key === pPath);
                                return (
                                  <span
                                    key={pPath}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                  >
                                    {pageDef?.label || pPath}
                                  </span>
                                );
                              })}
                              {perms.length > 3 && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60">
                                  +{perms.length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>No pages permitted (Access Restricted)</span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleOpenPermsModal(u)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Manage Access</span>
                          </button>

                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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
      )}

      {/* 4. PARTNER TELEMETRY CARD */}
      {partnerStatus?.partner && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                {partnerStatus.partner.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Partner Telemetry
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {partnerStatus.partner.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {partnerStatus.partner.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    partnerStatus.isReachable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {partnerStatus.statusText}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Last Check-in: {partnerStatus.hoursSinceCheckIn} hours ago
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECURITY PREFERENCES, PASSWORD & 2FA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Password Security Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Account Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Change temporary or existing password
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Password Status
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Active & Configured
              </span>
            </div>

            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </div>

        {/* 2FA Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Two-Factor (2FA)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Protect with TOTP authenticator app
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Security Status
              </span>
              <span
                className={`text-xs font-bold ${
                  currentUser?.totpEnabled
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {currentUser?.totpEnabled ? 'Enabled & Active' : 'Not Enabled'}
              </span>
            </div>

            {currentUser?.totpEnabled ? (
              <button
                onClick={handleDisable2FA}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={() => setIs2FAModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Setup 2FA</span>
              </button>
            )}
          </div>
        </div>

        {/* Siren Audio Prefs Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Emergency Siren Audio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audio on emergency access attempts
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Siren Alarm Audio
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                {sirenPref ? 'Sound Enabled' : 'Muted'}
              </span>
            </div>

            <button
              onClick={handleToggleSirenPref}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                sirenPref
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
              }`}
            >
              {sirenPref ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {is2FAModalOpen && <TwoFactorSetupModal onClose={() => setIs2FAModalOpen(false)} />}

      {/* ------------------------------------------------------------- */}
      {/* 6. CHANGE PASSWORD MODAL (FOR NS & AD)                        */}
      {/* ------------------------------------------------------------- */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Change Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update temporary password or set a new vault password.
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
                  Current / Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current or temporary password"
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
      {/* 7. MANAGE PAGE ACCESS CHECKBOX MODAL (ROLE AD ONLY)           */}
      {/* ------------------------------------------------------------- */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-xl my-6 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Manage Page Access</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold">
                      {selectedUserForPerms.name} ({selectedUserForPerms.role})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Check the pages and modules this user is allowed to access.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForPerms(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedUserForPerms.role === 'AD' ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Super Administrator (Role AD)</span>
                </div>
                <p>
                  User <strong>{selectedUserForPerms.name}</strong> holds the <strong>AD</strong> role and has full, unconditional access to all system pages and admin controls.
                </p>
              </div>
            ) : (
              <>
                {/* Quick Selection Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Selectable Pages Matrix
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPerms}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                    >
                      ✓ Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPerms}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                    >
                      ✕ Deselect All
                    </button>
                  </div>
                </div>

                {/* Categorized Checkbox List */}
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                  {categories.map((cat) => {
                    const catPages = APP_PAGES.filter((p) => p.category === cat && !p.adminOnly);
                    if (catPages.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                          {cat}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catPages.map((page) => {
                            const isChecked = selectedPerms.includes(page.path);

                            return (
                              <label
                                key={page.path}
                                onClick={() => handleTogglePermCheckbox(page.path)}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/80 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isChecked ? (
                                    <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                      {page.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {page.path}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                    {page.description}
                                  </p>
                                </div>
                              </label>
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
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-mono">
                {selectedPerms.length} Pages Permitted
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPerms(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingPerms}
                  onClick={handleSavePermissions}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPerms ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Permissions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. CREATE NEW USER MODAL (ROLE AD ONLY)                        */}
      {/* ------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <form
            onSubmit={handleCreateUser}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-xl my-6 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create User Account (AD / NS)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set a temporary password and configure authorized page modules.
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

            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              {/* Account Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Partner NS"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. user2@looser.vault"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Temporary Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    Temporary creation password. NS can change their password at any time.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="NS">🛡️ Partner NS (Custom Page Access)</option>
                    <option value="AD">👑 Super Admin AD (Full Access to All Pages)</option>
                  </select>
                </div>
              </div>

              {/* Page Permissions Matrix for New User */}
              {newUserRole !== 'AD' && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Authorized Pages Selection
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Check which pages this user is allowed to access.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewUserPerms(APP_PAGES.filter((p) => !p.adminOnly).map((p) => p.path))}
                        className="px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewUserPerms([])}
                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {APP_PAGES.filter((p) => !p.adminOnly).map((page) => {
                      const isChecked = newUserPerms.includes(page.path);
                      return (
                        <label
                          key={page.path}
                          onClick={() => {
                            if (isChecked) {
                              setNewUserPerms(newUserPerms.filter((p) => p !== page.path));
                            } else {
                              setNewUserPerms([...newUserPerms, page.path]);
                            }
                          }}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer select-none text-xs transition ${
                            isChecked
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/80 font-bold text-blue-900 dark:text-blue-200'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="shrink-0">
                            {isChecked ? (
                              <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                            )}
                          </div>
                          <span className="truncate">{page.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-auto">
                            {page.path}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isCreatingUser}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCreatingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create User</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
