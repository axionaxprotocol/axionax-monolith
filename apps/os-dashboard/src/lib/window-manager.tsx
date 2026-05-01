"use client";

// Lightweight window-management context for the Axionax OS dashboard.
//
// Why hand-rolled instead of `react-rnd`:
//   * zero extra deps (the dashboard is shipped over the wire)
//   * the matte-black glass look is easier to keep consistent when we own
//     the chrome
//   * mobile fallback (auto-maximize on small screens) is one-liner here
//
// Surface:
//   <WindowManagerProvider>...</WindowManagerProvider>   wrap the layout
//   useWindowManager()                                    hook for callers
//
// The actual rendering lives in <Window /> (components/window.tsx) which
// reads `windows` from this context and paints them.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type WindowKind = "terminal" | "node-monitor" | "settings" | "custom";

export interface WindowState {
  id: string;
  kind: WindowKind;
  title: string;
  /** Lazy content factory so windows don't import each other's modules eagerly. */
  render: () => ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  /** When true, ignore drag/resize and fill the viewport. */
  maximized: boolean;
  /** Minimum allowed dimensions when resizing. */
  minWidth: number;
  minHeight: number;
}

export interface OpenWindowInput {
  id?: string;
  kind?: WindowKind;
  title: string;
  render: () => ReactNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
}

interface WindowManagerContextValue {
  windows: WindowState[];
  openWindow: (input: OpenWindowInput) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

const STORAGE_KEY = "axionax-windows-v1";

// Persisted-only fields. We never serialize `render`.
type PersistedWindow = Omit<WindowState, "render">;

function loadPersisted(): PersistedWindow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedWindow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePersisted(windows: WindowState[]) {
  if (typeof window === "undefined") return;
  try {
    const persistable: PersistedWindow[] = windows.map(
      ({ render: _render, ...rest }) => rest,
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    /* localStorage may be unavailable (private mode, quota) */
  }
}

let nextId = 0;
function generateId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now().toString(36)}-${nextId}`;
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const topZ = useRef(10);

  // Hydrate persisted layout once on mount. We don't restore `render` —
  // callers that want stateful restoration should reopen the window in
  // their own `useEffect` and reuse the persisted id.
  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted.length === 0) return;
    topZ.current = Math.max(topZ.current, ...persisted.map((w) => w.zIndex));
    // We deliberately drop windows that didn't get reopened — `render` is gone.
    // Keeping the empty array lets the caller decide which to recreate.
  }, []);

  // Persist on every change.
  useEffect(() => {
    savePersisted(windows);
  }, [windows]);

  const focusWindow = useCallback((id: string) => {
    setWindows((curr) => {
      const target = curr.find((w) => w.id === id);
      if (!target) return curr;
      topZ.current += 1;
      return curr.map((w) => (w.id === id ? { ...w, zIndex: topZ.current, minimized: false } : w));
    });
  }, []);

  const openWindow = useCallback((input: OpenWindowInput): string => {
    const id = input.id ?? generateId(input.kind ?? "win");
    setWindows((curr) => {
      // Re-focus existing window with the same id instead of duplicating.
      const existing = curr.find((w) => w.id === id);
      if (existing) {
        topZ.current += 1;
        return curr.map((w) =>
          w.id === id ? { ...w, zIndex: topZ.current, minimized: false } : w,
        );
      }
      topZ.current += 1;
      const persisted = loadPersisted().find((p) => p.id === id);
      const next: WindowState = {
        id,
        kind: input.kind ?? "custom",
        title: input.title,
        render: input.render,
        x: persisted?.x ?? input.x ?? 80 + curr.length * 24,
        y: persisted?.y ?? input.y ?? 80 + curr.length * 24,
        width: persisted?.width ?? input.width ?? 560,
        height: persisted?.height ?? input.height ?? 380,
        zIndex: topZ.current,
        minimized: false,
        maximized: persisted?.maximized ?? false,
        minWidth: input.minWidth ?? 320,
        minHeight: input.minHeight ?? 200,
      };
      return [...curr, next];
    });
    return id;
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((curr) => curr.filter((w) => w.id !== id));
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows((curr) =>
      curr.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)),
    );
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((curr) =>
      curr.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)),
    );
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((curr) =>
      curr.map((w) => (w.id === id ? { ...w, x, y } : w)),
    );
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setWindows((curr) =>
      curr.map((w) =>
        w.id === id
          ? {
              ...w,
              width: Math.max(w.minWidth, width),
              height: Math.max(w.minHeight, height),
            }
          : w,
      ),
    );
  }, []);

  const value = useMemo<WindowManagerContextValue>(
    () => ({
      windows,
      openWindow,
      closeWindow,
      focusWindow,
      toggleMinimize,
      toggleMaximize,
      moveWindow,
      resizeWindow,
    }),
    [
      windows,
      openWindow,
      closeWindow,
      focusWindow,
      toggleMinimize,
      toggleMaximize,
      moveWindow,
      resizeWindow,
    ],
  );

  return (
    <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>
  );
}

export function useWindowManager(): WindowManagerContextValue {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) {
    throw new Error("useWindowManager must be used inside <WindowManagerProvider>");
  }
  return ctx;
}
