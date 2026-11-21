import { Cross, LogIn, LogOut, Moon, ShieldCheck, Sun, UserCheck } from 'lucide-react';
import type { AuthUser } from '../types/clinic';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  authUser: AuthUser | null;
  onLogout: () => void;
}

export function Header({
  currentPath,
  onNavigate,
  theme,
  onToggleTheme,
  authUser,
  onLogout,
}: HeaderProps) {
  const isStaff = currentPath.startsWith('/staff');
  const isLogin = currentPath.startsWith('/login');

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[#CFE3EE] bg-white/95 shadow-[0_1px_0_rgba(14,116,144,0.06)] backdrop-blur-sm dark:border-[#1E3347] dark:bg-[#0F1B26]/95">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-6 sm:px-6">
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="inline-flex items-center gap-2 font-display text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 sm:text-lg dark:text-slate-50"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#0E7490] text-white shadow-xs dark:bg-cyan-600"
          >
            <Cross className="h-3.5 w-3.5 fill-current" />
          </span>
          <span>
            Bright Roots <span className="hidden sm:inline">Dental</span>
          </span>
        </a>

        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium"
        >
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
              !isStaff && !isLogin
                ? 'border-[#0E7490] text-[#0E7490] dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span className="sm:hidden">Chat</span>
            <span className="hidden sm:inline">Patient Chat</span>
          </a>
          <a
            href="/staff"
            onClick={(e) => handleLinkClick(e, '/staff')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
              isStaff
                ? 'border-[#0E7490] text-[#0E7490] dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span className="sm:hidden">Portal</span>
            <span className="hidden sm:inline">Staff & Admin</span>
          </a>
          {!authUser && (
            <a
              href="/login"
              onClick={(e) => handleLinkClick(e, '/login')}
              className={`inline-flex items-center gap-1 py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isLogin
                  ? 'border-[#0E7490] text-[#0E7490] dark:border-cyan-400 dark:text-cyan-300'
                  : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Login</span>
            </a>
          )}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          {authUser && (
            <div className="flex items-center gap-1.5">
              <span
                className={`hidden md:inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${
                  authUser.role === 'admin'
                    ? 'border-cyan-200 bg-[#ECF8FC] text-[#0E7490] dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                    : 'border-emerald-200 bg-[#ECFDF5] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {authUser.role === 'admin' ? (
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <UserCheck className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{authUser.role === 'admin' ? 'Admin' : 'Staff'}</span>
              </span>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign out"
                title={`Sign out (${authUser.displayName})`}
                className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#CFE3EE] bg-[#F2F8FB] px-2 text-xs font-medium text-slate-700 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-700 whitespace-nowrap shrink-0 dark:border-[#1E3347] dark:bg-[#152534] dark:text-slate-200 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center gap-1.5 rounded-xl border border-[#CFE3EE] bg-[#F2F8FB] px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-[#E2F1F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7490] whitespace-nowrap shrink-0 dark:border-[#1E3347] dark:bg-[#152534] dark:text-slate-200 dark:hover:bg-[#1C3144]"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#0E7490]" aria-hidden="true" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
