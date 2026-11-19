import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { PatientChat } from './components/PatientChat';
import { StaffQueue } from './components/StaffQueue';

const THEME_STORAGE_KEY = 'bright_roots_theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
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

  const isStaffPage = pathname.startsWith('/staff');

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header
        currentPath={pathname}
        onNavigate={navigate}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {isStaffPage ? <StaffQueue /> : <PatientChat />}
    </div>
  );
}
