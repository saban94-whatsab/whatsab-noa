import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type ToastKind = 'success' | 'info' | 'error' | 'warning';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  /** auto-dismiss duration in ms */
  duration: number;
}

interface UiState {
  theme: ThemeMode;
  toasts: ToastItem[];
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  pushToast: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  dismissToast: (id: string) => void;
}

/** Reflect the current theme onto <html> so CSS tokens switch. */
export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Enable smooth transition only for user-driven switches (not first paint)
  root.classList.add('theme-anim');
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');

  const themeColor = theme === 'dark' ? '#0b141a' : '#e7edf0';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColor);

  window.setTimeout(() => root.classList.remove('theme-anim'), 500);
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toasts: [],

      setTheme: (theme) => {
        applyThemeToDocument(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
        applyThemeToDocument(next);
        set({ theme: next });
      },

      pushToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const item: ToastItem = {
          id,
          kind: toast.kind,
          title: toast.title,
          message: toast.message,
          duration: toast.duration ?? 4000,
        };
        set((state) => ({ toasts: [item, ...state.toasts].slice(0, 4) }));
        return id;
      },

      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'saban_ui_prefs_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        // Apply persisted theme on load without the transition flash
        if (state?.theme && typeof document !== 'undefined') {
          const root = document.documentElement;
          root.classList.toggle('dark', state.theme === 'dark');
          root.classList.toggle('light', state.theme === 'light');
        }
      },
    }
  )
);
