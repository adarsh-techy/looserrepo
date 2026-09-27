import React, { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { fetchProfile, logout } from './store/slices/core/authSlice';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { hasPageAccess, getDefaultAccessibleRoute } from './utils/permissions';

const BusinessPage = lazy(() => import('./pages/business/BusinessPage').then((m) => ({ default: m.BusinessPage })));
const BusinessDetailPage = lazy(() => import('./pages/business/BusinessDetailPage').then((m) => ({ default: m.BusinessDetailPage })));
const FuturePlansPage = lazy(() => import('./pages/futurePlans/FuturePlansPage').then((m) => ({ default: m.FuturePlansPage })));
const FuturePlanDetailPage = lazy(() => import('./pages/futurePlans/FuturePlanDetailPage').then((m) => ({ default: m.FuturePlanDetailPage })));
const DayToDayPage = lazy(() => import('./pages/dayToDay/DayToDayPage').then((m) => ({ default: m.DayToDayPage })));
const PasswordsPage = lazy(() => import('./pages/passwords/PasswordsPage').then((m) => ({ default: m.PasswordsPage })));
const PersonalPasswordsPage = lazy(() => import('./pages/passwords/PersonalPasswordsPage').then((m) => ({ default: m.PersonalPasswordsPage })));
const SecretNotesPage = lazy(() => import('./pages/secretNotes/SecretNotesPage').then((m) => ({ default: m.SecretNotesPage })));
const MySecretNotesPage = lazy(() => import('./pages/secretNotes/MySecretNotesPage').then((m) => ({ default: m.MySecretNotesPage })));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const RemindersNotesPage = lazy(() => import('./pages/notifications/RemindersNotesPage').then((m) => ({ default: m.RemindersNotesPage })));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const MoneyManagementPage = lazy(() => import('./pages/money/MoneyManagementPage').then((m) => ({ default: m.MoneyManagementPage })));
const WorksPage = lazy(() => import('./pages/works/WorksPage').then((m) => ({ default: m.WorksPage })));
const WorkFormPage = lazy(() => import('./pages/works/WorkFormPage').then((m) => ({ default: m.WorkFormPage })));
const TrashPage = lazy(() => import('./pages/trash/TrashPage').then((m) => ({ default: m.TrashPage })));
const HealthPage = lazy(() => import('./pages/health/HealthPage').then((m) => ({ default: m.HealthPage })));
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PermissionRoute: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  if (!user) return <>{children}</>;
  if (!hasPageAccess(user, path)) {
    const fallback = getDefaultAccessibleRoute(user);
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (token) {
      dispatch(fetchProfile());
    }

    const handleUnauthorized = () => {
      dispatch(logout());
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [token, dispatch]);

  const defaultRoute = getDefaultAccessibleRoute(user);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to={defaultRoute} replace />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={defaultRoute} replace />} />
          <Route path="works" element={<PermissionRoute path="/works"><WorksPage /></PermissionRoute>} />
          <Route path="works/new" element={<PermissionRoute path="/works"><WorkFormPage /></PermissionRoute>} />
          <Route path="works/edit/:id" element={<PermissionRoute path="/works"><WorkFormPage /></PermissionRoute>} />
          <Route path="works/:id/edit" element={<PermissionRoute path="/works"><WorkFormPage /></PermissionRoute>} />
          <Route path="money-management" element={<PermissionRoute path="/money-management"><MoneyManagementPage /></PermissionRoute>} />
          <Route path="payments" element={<PermissionRoute path="/payments"><PaymentsPage /></PermissionRoute>} />
          <Route path="messages" element={<Navigate to="/payments" replace />} />
          <Route path="business" element={<PermissionRoute path="/business"><BusinessPage /></PermissionRoute>} />
          <Route path="business/:id" element={<PermissionRoute path="/business"><BusinessDetailPage /></PermissionRoute>} />
          <Route path="future-plans" element={<PermissionRoute path="/future-plans"><FuturePlansPage /></PermissionRoute>} />
          <Route path="future-plans/:id" element={<PermissionRoute path="/future-plans"><FuturePlanDetailPage /></PermissionRoute>} />
          <Route path="day-to-day" element={<PermissionRoute path="/day-to-day"><DayToDayPage /></PermissionRoute>} />
          <Route path="passwords" element={<PermissionRoute path="/passwords"><PasswordsPage /></PermissionRoute>} />
          <Route path="personal-passwords" element={<PermissionRoute path="/personal-passwords"><PersonalPasswordsPage /></PermissionRoute>} />
          <Route path="documents" element={<PermissionRoute path="/documents"><DocumentsPage /></PermissionRoute>} />
          <Route path="secret-notes" element={<PermissionRoute path="/secret-notes"><SecretNotesPage /></PermissionRoute>} />
          <Route path="my-secret-notes" element={<PermissionRoute path="/my-secret-notes"><MySecretNotesPage /></PermissionRoute>} />
          <Route path="audit-log" element={<PermissionRoute path="/audit-log"><AuditLogPage /></PermissionRoute>} />
          <Route path="audit-logs" element={<Navigate to="/audit-log" replace />} />
          <Route path="users" element={<PermissionRoute path="/users"><UsersPage /></PermissionRoute>} />
          <Route path="notifications" element={<PermissionRoute path="/notifications"><NotificationsPage /></PermissionRoute>} />
          <Route path="reminders-notes" element={<PermissionRoute path="/reminders-notes"><RemindersNotesPage /></PermissionRoute>} />
          <Route path="health" element={<PermissionRoute path="/health"><HealthPage /></PermissionRoute>} />
          <Route path="trash" element={<PermissionRoute path="/trash"><TrashPage /></PermissionRoute>} />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
};
