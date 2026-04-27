# Axionax Web - Copilot Instructions

# Target Model: Claude 4.5 Sonnet

**Context:** Axionax Explorer & Dashboard (React 19, TypeScript, Tailwind).

## 🎨 MODERN FRONTEND RULES

1.  **React 19 Paradigms:**
    - Use Server Components (RSC) by default where interactive state isn't needed.
    - Use `"use client"` explicitly for interactive components.
    - Prefer `use` hook over `useEffect` for data fetching.

2.  **Styling (Tailwind):**
    - **Mobile-First:** Write `class="flex flex-col md:flex-row"`.
    - **Clean:** Use `clsx` or `tailwind-merge`. No inline styles.
    - **Accessibility:** Auto-include `aria-label` for icon buttons.

3.  **State Management:**
    - Global: `Zustand`.
    - Server State: `TanStack Query v5`.

4.  **Output Behavior:**
    - When creating components, always include the `interface Props` definition.
    - Mock data should be realistic (e.g., mock an Ethereum address, not "string").
