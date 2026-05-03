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
      className="flex items-center gap-3 px-4 cursor-grab active:cursor-grabbing border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent"
    >
      {/* Modern traffic lights with subtle glow effects */}
      <div className="flex items-center gap-2">
        <TrafficLightButton
          onClick={onClose}
          ariaLabel="Close"
          bgColor="bg-rose-500"
          hoverColor="bg-rose-400"
          glowColor="shadow-rose-500/50"
          icon={<X size={7} className="text-rose-950" />}
        />
        <TrafficLightButton
          onClick={onMinimize}
          ariaLabel="Minimize"
          bgColor="bg-amber-400"
          hoverColor="bg-amber-300"
          glowColor="shadow-amber-400/50"
          icon={<Minus size={7} className="text-amber-950" />}
        />
        <TrafficLightButton
          onClick={onMaximize}
          ariaLabel="Maximize"
          bgColor="bg-emerald-500"
          hoverColor="bg-emerald-400"
          glowColor="shadow-emerald-500/50"
          icon={<Maximize2 size={7} className="text-emerald-950" />}
        />
      </div>
      
      <div className="flex-1 text-center">
        <span className="text-xs text-zinc-400 font-medium tracking-wide truncate select-none px-4 py-1 rounded-full bg-white/[0.03]">
          {title}
        </span>
      </div>
      
      <span className="w-16" /> {/* balance the traffic-light cluster */}
    </div>
  );
}

function TrafficLightButton({
  onClick,
  ariaLabel,
  bgColor,
  hoverColor,
  glowColor,
  icon,
}: {
  onClick: () => void;
  ariaLabel: string;
  bgColor: string;
  hoverColor: string;
  glowColor: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={ariaLabel}
      className={`group relative h-3.5 w-3.5 rounded-full ${bgColor} hover:${hoverColor} 
        transition-all duration-200 ease-out grid place-items-center
        hover:scale-110 hover:shadow-lg ${glowColor}`}
    >
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 scale-75 group-hover:scale-100">
        {icon}
      </span>
    </button>
  );
}
