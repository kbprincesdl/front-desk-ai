import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { PatientChat } from './components/PatientChat';
import { StaffQueue } from './components/StaffQueue';
import type { AuthSessionState } from './types/clinic';

const THEME_STORAGE_KEY = 'bright_roots_theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Ignore storage read restrictions
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  // Bearer token and session kept strictly in React memory (never persisted in Web Storage)
  const [authSession, setAuthSession] = useState<AuthSessionState | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write restrictions
    }
  }, [theme]);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    if (window.location.pathname === nextPath && !window.location.search) return;
    window.history.pushState({}, '', nextPath);
    setPathname(nextPath);
    window.scrollTo({ top: 0 });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleAuthenticated = useCallback(
    (session: AuthSessionState) => {
      setAuthSession(session);
      navigate('/staff');
    },
    [navigate],
  );

  const handleLogout = useCallback(() => {
    setAuthSession(null);
    navigate('/login');
  }, [navigate]);

  const isStaffPage = pathname.startsWith('/staff');
  const isLoginPage = pathname.startsWith('/login');

  return (
    <div className="min-h-dvh bg-[#F2F8FB] text-slate-900 dark:bg-[#0B141C] dark:text-slate-100">
      <Header
        currentPath={pathname}
        onNavigate={navigate}
        theme={theme}
        onToggleTheme={toggleTheme}
        authUser={authSession?.user ?? null}
        onLogout={handleLogout}
      />
      {isLoginPage || (isStaffPage && !authSession) ? (
        <LoginScreen
          onAuthenticated={handleAuthenticated}
          onBackToChat={() => navigate('/')}
        />
      ) : isStaffPage && authSession ? (
        <StaffQueue authSession={authSession} onLogout={handleLogout} />
      ) : (
        <PatientChat authSession={authSession} />
      )}
    </div>
  );
}
