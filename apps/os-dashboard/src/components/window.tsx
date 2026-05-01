"use client";

// Window chrome — draggable + resizable + matte-black glass.
//
// Reads from <WindowManagerProvider /> (lib/window-manager.tsx). Renders
// every non-minimized window stacked by zIndex; drops back into a viewport
// fill when `maximized`.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, X } from "lucide-react";

import { useWindowManager, type WindowState } from "@/lib/window-manager";

export function WindowLayer() {
  const { windows } = useWindowManager();

  return (
    <>
      {windows
        .filter((w) => !w.minimized)
        .map((w) => (
          <Window key={w.id} state={w} />
        ))}
    </>
  );
}

const TITLEBAR_HEIGHT = 36;
const RESIZE_HANDLE = 14;

function Window({ state }: { state: WindowState }) {
  const { focusWindow, closeWindow, toggleMinimize, toggleMaximize, moveWindow, resizeWindow } =
    useWindowManager();
  const ref = useRef<HTMLDivElement>(null);

  // We track "drag" (move) and "resize" interactions in refs so the listeners
  // installed on `window` always see fresh state without re-binding.
  const drag = useRef<null | { offsetX: number; offsetY: number }>(null);
  const resize = useRef<null | { startX: number; startY: number; w: number; h: number }>(null);
  const [interacting, setInteracting] = useState<"drag" | "resize" | null>(null);

  const onTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (state.maximized) return;
      focusWindow(state.id);
      drag.current = {
        offsetX: e.clientX - state.x,
        offsetY: e.clientY - state.y,
      };
      setInteracting("drag");
    },
    [focusWindow, state.id, state.maximized, state.x, state.y],
  );

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (state.maximized) return;
      e.stopPropagation();
      focusWindow(state.id);
      resize.current = {
        startX: e.clientX,
        startY: e.clientY,
        w: state.width,
        h: state.height,
      };
      setInteracting("resize");
    },
    [focusWindow, state.height, state.id, state.maximized, state.width],
  );

  useEffect(() => {
    if (!interacting) return;

    const onMove = (e: MouseEvent) => {
      if (interacting === "drag" && drag.current) {
        const nx = Math.max(0, e.clientX - drag.current.offsetX);
        const ny = Math.max(0, e.clientY - drag.current.offsetY);
        moveWindow(state.id, nx, ny);
      } else if (interacting === "resize" && resize.current) {
        const nw = resize.current.w + (e.clientX - resize.current.startX);
        const nh = resize.current.h + (e.clientY - resize.current.startY);
        resizeWindow(state.id, nw, nh);
      }
    };
    const onUp = () => {
      drag.current = null;
      resize.current = null;
      setInteracting(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [interacting, moveWindow, resizeWindow, state.id]);

  // Geometry: maximize forces full viewport; otherwise use stored coords.
  const style: React.CSSProperties = state.maximized
    ? {
        top: 48,
        left: 12,
        right: 12,
        bottom: 96, // leave room for the dock
        zIndex: state.zIndex,
      }
    : {
        top: state.y,
        left: state.x,
        width: state.width,
        height: state.height,
        zIndex: state.zIndex,
      };

  return (
    <div
      ref={ref}
      style={style}
      className={`fixed glass-strong rounded-xl shadow-glass-strong overflow-hidden flex flex-col animate-fade-in ${
        interacting ? "select-none" : ""
      } ${state.maximized ? "" : "transition-shadow"}`}
      onMouseDown={() => focusWindow(state.id)}
    >
      <Titlebar
        title={state.title}
        onMouseDown={onTitleMouseDown}
        onMinimize={() => toggleMinimize(state.id)}
        onMaximize={() => toggleMaximize(state.id)}
        onClose={() => closeWindow(state.id)}
      />
      <div className="flex-1 min-h-0 overflow-auto">{state.render()}</div>
      {!state.maximized && (
        <button
          aria-label="Resize"
          onMouseDown={onResizeMouseDown}
          className="absolute bottom-0 right-0 cursor-se-resize"
          style={{ width: RESIZE_HANDLE, height: RESIZE_HANDLE }}
        >
          <span className="block w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20" />
        </button>
      )}
    </div>
  );
}

function Titlebar({
  title,
  onMouseDown,
  onMinimize,
  onMaximize,
  onClose,
}: {
  title: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{ height: TITLEBAR_HEIGHT }}
      className="flex items-center gap-2 px-3 cursor-grab active:cursor-grabbing border-b border-white/5 bg-white/[0.02]"
    >
      {/* Mac-style traffic lights */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="group h-3 w-3 rounded-full bg-rose-500 hover:bg-rose-400 grid place-items-center"
        >
          <X size={8} className="text-rose-900 opacity-0 group-hover:opacity-100" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMinimize();
          }}
          aria-label="Minimize"
          className="group h-3 w-3 rounded-full bg-amber-400 hover:bg-amber-300 grid place-items-center"
        >
          <Minus size={8} className="text-amber-900 opacity-0 group-hover:opacity-100" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMaximize();
          }}
          aria-label="Maximize"
          className="group h-3 w-3 rounded-full bg-emerald-500 hover:bg-emerald-400 grid place-items-center"
        >
          <Maximize2 size={8} className="text-emerald-900 opacity-0 group-hover:opacity-100" />
        </button>
      </div>
      <div className="flex-1 text-center text-xs text-zinc-300 font-medium truncate select-none">
        {title}
      </div>
      <span className="w-12" /> {/* balance the traffic-light cluster */}
    </div>
  );
}
