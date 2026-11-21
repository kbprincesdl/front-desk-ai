import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({
  currentPath,
  onNavigate,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const isStaff = currentPath.startsWith('/staff');

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[#EFE2D3] bg-[#FFFDF9]/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#161C22]/95">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-3 sm:gap-8 sm:px-6">
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="font-display text-sm font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 sm:text-lg dark:text-[#FAF5EF]"
        >
          Bright Roots Dental
        </a>

        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium"
        >
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
              !isStaff
                ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100'
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
                ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span className="sm:hidden">Staff</span>
            <span className="hidden sm:inline">Staff Queue</span>
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#E7D8C5] bg-[#FFF9F2] px-2.5 text-xs font-medium text-stone-700 transition-colors hover:bg-[#F5EADF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-stone-600" aria-hidden="true" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
