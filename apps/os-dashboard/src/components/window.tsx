"use client";

// Window chrome — draggable + resizable + matte-black glass.
//
// Reads from <WindowManagerProvider /> (lib/window-manager.tsx). Renders
// every non-minimized window stacked by zIndex; drops back into a viewport
// fill when `maximized`.
//
// Design intent:
//   - Traffic-light controls stay mac-native (rose / amber / emerald).
//   - Title is centered, muted, no pill — let the content breathe.
//   - Resize handle is a corner chevron, not a grip, so it reads as OS-level.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, X, type LucideIcon } from "lucide-react";

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
      className={`fixed glass-strong rounded-os-xl shadow-glass-strong overflow-hidden flex flex-col animate-scale-in ${
        interacting ? "select-none" : ""
      } ${state.maximized ? "" : "transition-shadow duration-base"}`}
      onMouseDown={() => focusWindow(state.id)}
      role="dialog"
      aria-label={state.title}
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
          type="button"
          aria-label="Resize window"
          onMouseDown={onResizeMouseDown}
          className="absolute bottom-0 right-0 cursor-se-resize focus:outline-none group"
          style={{ width: RESIZE_HANDLE, height: RESIZE_HANDLE }}
        >
          <span className="block w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/15 group-hover:to-white/30 transition-colors duration-fast" />
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
      className="flex items-center gap-3 px-os-4 cursor-grab active:cursor-grabbing border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent"
    >
      <div className="flex items-center gap-2">
        <TrafficLight onClick={onClose} label="Close" base="bg-rose-500" hover="hover:bg-rose-400" Icon={X} />
        <TrafficLight onClick={onMinimize} label="Minimize" base="bg-amber-400" hover="hover:bg-amber-300" Icon={Minus} />
        <TrafficLight onClick={onMaximize} label="Maximize" base="bg-emerald-500" hover="hover:bg-emerald-400" Icon={Maximize2} />
      </div>

      <div className="flex-1 text-center">
        <span className="text-[11px] text-zinc-400 font-medium tracking-tight truncate select-none">
          {title}
        </span>
      </div>

      <span className="w-16" aria-hidden="true" />
    </div>
  );
}

function TrafficLight({
  onClick,
  label,
  base,
  hover,
  Icon,
}: {
  onClick: () => void;
  label: string;
  base: string;
  hover: string;
  Icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`group relative h-3 w-3 rounded-full ${base} ${hover} transition-all duration-fast ease-os grid place-items-center hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
    >
      <Icon
        size={7}
        className="opacity-0 group-hover:opacity-70 text-black transition-opacity duration-fast"
        strokeWidth={2.5}
      />
    </button>
  );
}
