"use client";

// Window chrome — draggable + resizable + matte-black glass.
// Data-Dense Dashboard style.

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

const TITLEBAR_HEIGHT = 32; // tighter for data-dense
const RESIZE_HANDLE = 12;

function Window({ state }: { state: WindowState }) {
  const { focusWindow, closeWindow, toggleMinimize, toggleMaximize, moveWindow, resizeWindow } =
    useWindowManager();
  const ref = useRef<HTMLDivElement>(null);

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

  const style: React.CSSProperties = state.maximized
    ? {
        top: 40, // right under menubar
        left: 0,
        right: 0,
        bottom: 64, // leave room for dock
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
      className={`fixed bg-bg-card border border-border rounded-os-lg shadow-glass-xl overflow-hidden flex flex-col animate-scale-in ${
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
      <div className="flex-1 min-h-0 overflow-auto bg-bg-DEFAULT">{state.render()}</div>
      {!state.maximized && (
        <button
          type="button"
          aria-label="Resize window"
          onMouseDown={onResizeMouseDown}
          className="absolute bottom-0 right-0 cursor-se-resize focus:outline-none group"
          style={{ width: RESIZE_HANDLE, height: RESIZE_HANDLE }}
        >
          <span className="block w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/10 group-hover:to-white/20 transition-colors duration-fast" />
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
      className="flex items-center gap-3 px-os-3 cursor-grab active:cursor-grabbing border-b border-border bg-bg-elev"
    >
      <div className="flex items-center gap-2">
        <TrafficLight onClick={onClose} label="Close" base="bg-accent-danger" hover="hover:brightness-110" Icon={X} />
        <TrafficLight onClick={onMinimize} label="Minimize" base="bg-accent-warn" hover="hover:brightness-110" Icon={Minus} />
        <TrafficLight onClick={onMaximize} label="Maximize" base="bg-accent-ok" hover="hover:brightness-110" Icon={Maximize2} />
      </div>

      <div className="flex-1 text-center">
        <span className="text-[10px] text-zinc-400 font-mono font-medium tracking-tight truncate select-none uppercase">
          {title}
        </span>
      </div>

      <span className="w-[52px]" aria-hidden="true" />
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
      className={`group relative h-2.5 w-2.5 rounded-full ${base} ${hover} transition-all duration-fast ease-os grid place-items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60`}
    >
      <Icon
        size={6}
        className="opacity-0 group-hover:opacity-70 text-black transition-opacity duration-fast"
        strokeWidth={3}
      />
    </button>
  );
}
