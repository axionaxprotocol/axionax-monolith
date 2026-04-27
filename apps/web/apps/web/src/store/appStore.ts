import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Interface สำหรับ global app state
interface AppState {
  // UI State
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// Zustand store สำหรับ global app state
// ใช้ devtools middleware เพื่อ debug ง่ายขึ้น (ใช้ได้กับ Redux DevTools)
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Initial state
      isSidebarOpen: false,
      theme: 'dark',

      // Actions
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-store', // ชื่อที่จะแสดงใน Redux DevTools
    }
  )
);
