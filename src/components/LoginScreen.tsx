import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { AuthSessionState, AuthStatusResponse, UserRole } from '../types/clinic';

interface LoginScreenProps {
  onAuthenticated: (session: AuthSessionState) => void;
  onBackToChat: () => void;
  initialRole?: UserRole;
}

export function LoginScreen({
  onAuthenticated,
  onBackToChat,
  initialRole = 'admin',
}: LoginScreenProps) {
  const [status, setStatus] = useState<AuthStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Sign-in state
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [username, setUsername] = useState(initialRole === 'admin' ? 'admin' : 'staff');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // First-time setup state
  const [setupAdminUsername, setSetupAdminUsername] = useState('admin');
  const [setupAdminName, setSetupAdminName] = useState('Clinic Admin');
  const [setupAdminPass, setSetupAdminPass] = useState('');
  const [setupAdminConfirm, setSetupAdminConfirm] = useState('');
  const [setupStaffUsername, setSetupStaffUsername] = useState('staff');
  const [setupStaffName, setSetupStaffName] = useState('Front Desk Staff');
  const [setupStaffPass, setSetupStaffPass] = useState('');
  const [showSetupStaff, setShowSetupStaff] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = (await res.json()) as AuthStatusResponse;
          if (active) setStatus(data);
        }
      } catch {
        if (active) {
          setError('Unable to reach clinic authentication service.');
        }
      } finally {
        if (active) setLoadingStatus(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleRoleSwitch = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    setUsername((prev) => {
      const trimmed = prev.trim().toLowerCase();
      if (!trimmed || trimmed === 'admin' || trimmed === 'staff') {
        return role === 'admin' ? 'admin' : 'staff';
      }
      return prev;
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          expectedRole: selectedRole,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: AuthSessionState['user'];
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error || 'Sign in failed. Check your username and password.');
        return;
      }
      onAuthenticated({ token: data.token, user: data.user });
    } catch {
      setError('Network error while signing in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (setupAdminUsername.trim().length < 3) {
      setError('Admin username must be at least 3 characters.');
      return;
    }
    if (setupAdminPass.length < 6) {
      setError('Admin password must be at least 6 characters.');
      return;
    }
    if (setupAdminPass !== setupAdminConfirm) {
      setError('Admin password and confirmation do not match.');
      return;
    }
    if (showSetupStaff && setupStaffPass.length > 0 && setupStaffPass.length < 6) {
      setError('Staff password must be at least 6 characters (or leave blank to add later).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUsername: setupAdminUsername.trim(),
          adminDisplayName: setupAdminName.trim() || 'Clinic Admin',
          adminPassword: setupAdminPass,
          staffUsername: showSetupStaff ? setupStaffUsername.trim() : undefined,
          staffDisplayName: showSetupStaff ? setupStaffName.trim() : undefined,
          staffPassword: showSetupStaff && setupStaffPass ? setupStaffPass : undefined,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: AuthSessionState['user'];
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error || 'Could not complete portal setup.');
        return;
      }
      onAuthenticated({ token: data.token, user: data.user });
    } catch {
      setError('Network error during portal setup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const needsInitialSetup = status !== null && !status.adminConfigured;

  return (
    <main className="animate-page-in mx-auto flex w-full max-w-xl flex-col px-3 py-6 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={onBackToChat}
        className="mb-4 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#0E7490] hover:underline dark:text-cyan-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Back to Patient Chat</span>
      </button>

      <section className="overflow-hidden rounded-2xl border border-[#CFE3EE] bg-white shadow-sm dark:border-[#1E3347] dark:bg-[#111E2B]">
        {/* Clinical Header Band */}
        <div className="border-b border-[#DCEBF3] bg-gradient-to-r from-[#E8F6FB] via-[#F4FAFD] to-[#EBF4FF] px-5 py-4 sm:px-6 dark:border-[#1E3347] dark:from-[#0F2433] dark:via-[#111E2B] dark:to-[#0F2033]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E7490] text-white shadow-xs dark:bg-cyan-600">
              {needsInitialSetup ? (
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Lock className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
                {needsInitialSetup
                  ? 'First-Time Clinic Portal Setup'
                  : 'Bright Roots Clinic Portal Login'}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {needsInitialSetup
                  ? 'Create your Admin credentials (and optional Staff login) to secure the portal.'
                  : 'Sign in as Admin or Front Desk Staff to access clinic operations.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {loadingStatus ? (
            <div className="space-y-3 py-4">
              <div className="h-10 animate-pulse rounded-xl bg-[#E8F6FB] dark:bg-[#152534]" />
              <div className="h-10 animate-pulse rounded-xl bg-[#E8F6FB] dark:bg-[#152534]" />
              <div className="h-10 animate-pulse rounded-xl bg-[#E8F6FB] dark:bg-[#152534]" />
            </div>
          ) : needsInitialSetup ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="space-y-3 rounded-xl border border-cyan-200 bg-[#F4FAFD] p-4 dark:border-cyan-900/60 dark:bg-[#152534]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0E7490] dark:text-cyan-300">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Admin User Account (Full Control)</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="mb-1 block">Admin Username</span>
                    <input
                      type="text"
                      required
                      value={setupAdminUsername}
                      onChange={(e) => setSetupAdminUsername(e.target.value)}
                      autoComplete="username"
                      className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="mb-1 block">Display Name</span>
                    <input
                      type="text"
                      value={setupAdminName}
                      onChange={(e) => setSetupAdminName(e.target.value)}
                      className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="mb-1 block">Admin Password (min 6 chars)</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={setupAdminPass}
                      onChange={(e) => setSetupAdminPass(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Choose Admin password"
                      className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="mb-1 block">Confirm Password</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={setupAdminConfirm}
                      onChange={(e) => setSetupAdminConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[#DCEBF3] bg-[#F8FCFE] p-4 dark:border-[#1E3347] dark:bg-[#0F1B26]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Stethoscope className="h-4 w-4" aria-hidden="true" />
                    <span>Staff User Account (Optional Now)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSetupStaff((v) => !v)}
                    className="text-[11px] font-semibold text-[#0E7490] hover:underline dark:text-cyan-300"
                  >
                    {showSetupStaff ? 'Hide' : 'Include Staff Login'}
                  </button>
                </div>

                {showSetupStaff && (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block">Staff Username</span>
                      <input
                        type="text"
                        value={setupStaffUsername}
                        onChange={(e) => setSetupStaffUsername(e.target.value)}
                        className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block">Display Name</span>
                      <input
                        type="text"
                        value={setupStaffName}
                        onChange={(e) => setSetupStaffName(e.target.value)}
                        className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block">Staff Password</span>
                      <input
                        type="password"
                        value={setupStaffPass}
                        onChange={(e) => setSetupStaffPass(e.target.value)}
                        placeholder="Optional (min 6)"
                        className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                      />
                    </label>
                  </div>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0E7490] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#155E75] disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-500"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>{submitting ? 'Creating Portal Accounts...' : 'Save & Sign In as Admin'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Role Selection Toggle: Admin User vs Staff User */}
              <div
                role="tablist"
                aria-label="Select portal user role"
                className="grid grid-cols-2 gap-2.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedRole === 'admin'}
                  onClick={() => handleRoleSwitch('admin')}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    selectedRole === 'admin'
                      ? 'border-[#0E7490] bg-[#ECF8FC] text-slate-900 ring-1 ring-[#0E7490] dark:border-cyan-400 dark:bg-[#122D3D] dark:text-slate-50 dark:ring-cyan-400'
                      : 'border-[#CFE3EE] bg-[#F8FCFE] text-slate-700 hover:border-[#94C6DC] dark:border-[#1E3347] dark:bg-[#0F1B26] dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <ShieldCheck
                      className={`h-4 w-4 ${
                        selectedRole === 'admin'
                          ? 'text-[#0E7490] dark:text-cyan-300'
                          : 'text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Admin User</span>
                  </div>
                  <span className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                    Analytics, Doctors, Staff Accounts & Queue
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedRole === 'staff'}
                  onClick={() => handleRoleSwitch('staff')}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    selectedRole === 'staff'
                      ? 'border-emerald-600 bg-[#ECFDF5] text-slate-900 ring-1 ring-emerald-600 dark:border-emerald-400 dark:bg-[#0E2A22] dark:text-slate-50 dark:ring-emerald-400'
                      : 'border-[#CFE3EE] bg-[#F8FCFE] text-slate-700 hover:border-[#94C6DC] dark:border-[#1E3347] dark:bg-[#0F1B26] dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <UserCheck
                      className={`h-4 w-4 ${
                        selectedRole === 'staff'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Staff User</span>
                  </div>
                  <span className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                    Ticket Replies, Bookings & Walk-in Visits
                  </span>
                </button>
              </div>

              {selectedRole === 'staff' && status && !status.staffConfigured && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                  No Staff account has been created yet. Sign in as Admin first to create a Staff login.
                </div>
              )}

              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="mb-1.5 block">Username</span>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder={selectedRole === 'admin' ? 'admin' : 'staff'}
                  className="min-h-[44px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0E7490] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/20 sm:text-sm dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
                />
              </label>

              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="mb-1.5 block">Password</span>
                <div className="flex items-center rounded-xl border border-[#BDD8E7] bg-white pr-1.5 focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20 dark:border-[#243B52] dark:bg-[#0B141C]">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="min-h-[44px] min-w-0 flex-1 bg-transparent px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-[#E8F6FB] dark:text-slate-400 dark:hover:bg-[#152534]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
                >
                  {error}
                </p>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={submitting || !username.trim() || !password}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50 ${
                  selectedRole === 'admin'
                    ? 'bg-[#0E7490] hover:bg-[#155E75] dark:bg-cyan-600 dark:hover:bg-cyan-500'
                    : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                }`}
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>
                  {submitting
                    ? 'Signing in...'
                    : selectedRole === 'admin'
                      ? 'Sign In as Admin'
                      : 'Sign In as Staff'}
                </span>
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
