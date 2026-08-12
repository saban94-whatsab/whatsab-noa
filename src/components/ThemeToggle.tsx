import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';

interface ThemeToggleProps {
  /** compact = icon-only pill (top bars), full = labelled switch (menus) */
  variant?: 'compact' | 'full';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'compact', className = '' }) => {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  if (variant === 'full') {
    return (
      <button
        onClick={toggleTheme}
        id="theme-toggle-full"
        dir="rtl"
        className={`group flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-xl glass border-[var(--glass-border)] hover:border-[var(--accent)]/50 transition-all ${className}`}
        title="החלף בין מצב כהה למצב בהיר"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          {isDark ? <Moon className="w-4 h-4 text-[var(--accent-strong)]" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>{isDark ? 'מצב כהה' : 'מצב בהיר'}</span>
        </span>
        <span
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isDark ? 'bg-[var(--panel-3)]' : 'bg-amber-400'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
              isDark ? 'right-0.5' : 'right-[22px]'
            }`}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-compact"
      aria-label={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
      title={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
      className={`relative w-9 h-9 rounded-xl grid place-items-center overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur text-[var(--ink)] hover:border-[var(--accent)]/60 hover:text-[var(--accent-strong)] transition-all active:scale-90 ${className}`}
    >
      <Sun
        className={`w-[18px] h-[18px] absolute transition-all duration-300 text-amber-500 ${
          isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
      />
      <Moon
        className={`w-[18px] h-[18px] absolute transition-all duration-300 text-[var(--accent-strong)] ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
        }`}
      />
    </button>
  );
};
