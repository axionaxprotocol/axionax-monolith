import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

// Dark theme only (day/night mode removed)
const applyThemeClass = () => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
  }
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: () => {
        applyThemeClass();
        set({ theme: 'dark' });
      },
    }),
    {
      name: 'ui-storage',
      onRehydrateStorage: () => () => applyThemeClass(),
    }
  )
);
