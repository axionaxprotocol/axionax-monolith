// Axionax OS — minimalist 1.25px-stroke icon set.
//
// Designed to sit alongside `lucide-react` icons without visual conflict.
// Every icon renders inside a 24x24 viewbox; size via the `size` prop.
//
// Usage:
//   import { Icon } from "@/icons/axionax-icons";
//   <Icon name="neural" size={18} className="text-accent-ai" />

import type { SVGProps } from "react";

export type AxionaxIconName =
  | "neural"
  | "node"
  | "peer"
  | "security"
  | "worker"
  | "edge";

type Props = SVGProps<SVGSVGElement> & {
  name: AxionaxIconName;
  size?: number;
};

const STROKE = 1.25;

const PATHS: Record<AxionaxIconName, JSX.Element> = {
  // Neural Network — three-layer perceptron
  neural: (
    <>
      <circle cx="4" cy="6" r="1.4" />
      <circle cx="4" cy="12" r="1.4" />
      <circle cx="4" cy="18" r="1.4" />
      <circle cx="12" cy="9" r="1.4" />
      <circle cx="12" cy="15" r="1.4" />
      <circle cx="20" cy="12" r="1.4" />
      <path d="M5.4 6L10.6 9M5.4 12L10.6 9M5.4 12L10.6 15M5.4 18L10.6 15M13.4 9L18.6 12M13.4 15L18.6 12" />
    </>
  ),
  // Blockchain Node — three stacked diamonds (a chain)
  node: (
    <>
      <path d="M12 2L18 5.5V11L12 14.5L6 11V5.5L12 2Z" />
      <path d="M12 9.5V14.5" />
      <path d="M6 11L12 14.5L18 11" />
      <path d="M12 16L17 18.5V21.5L12 24L7 21.5V18.5L12 16Z" />
    </>
  ),
  // Peer Discovery — concentric ripples + center dot
  peer: (
    <>
      <circle cx="12" cy="12" r="1.4" />
      <path d="M9 12a3 3 0 0 1 6 0" />
      <path d="M6 12a6 6 0 0 1 12 0" />
      <path d="M3 12a9 9 0 0 1 18 0" />
    </>
  ),
  // Security Shield — chevron with inner check
  security: (
    <>
      <path d="M12 2L20 5V12C20 17 16 21 12 22C8 21 4 17 4 12V5L12 2Z" />
      <path d="M9 12L11.2 14.2L15 10" />
    </>
  ),
  // DeAI Worker — gear with spark inside (compute + intelligence)
  worker: (
    <>
      <path d="M12 3.5V5.5M12 18.5V20.5M5.5 12H3.5M20.5 12H18.5M7.05 7.05L5.6 5.6M18.4 18.4L17 17M7.05 17L5.6 18.4M18.4 5.6L17 7.05" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 9.5L13 12L15 12.5L13.2 14L13.7 16L12 15L10.3 16L10.8 14L9 12.5L11 12L12 9.5Z" />
    </>
  ),
  // Edge Device — small box with antenna + signal arc
  edge: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      <path d="M8 16H10M12 16H14" />
      <path d="M12 11V7" />
      <path d="M9 5.5C10.5 4 13.5 4 15 5.5" />
      <path d="M7 3.5C9.5 1 14.5 1 17 3.5" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  strokeWidth = STROKE,
  ...rest
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export const ICON_NAMES: AxionaxIconName[] = [
  "neural",
  "node",
  "peer",
  "security",
  "worker",
  "edge",
];
