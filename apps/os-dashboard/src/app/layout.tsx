import "./globals.css";
import type { Metadata, Viewport } from "next";
import { MenuBar } from "@/components/menu-bar";
import { Dock } from "@/components/dock";

export const metadata: Metadata = {
  title: {
    default: "Axionax OS",
    template: "%s · Axionax OS",
  },
  description:
    "Self-hosted Axionax node dashboard: peers, jobs, wallet, and chain activity.",
  applicationName: "Axionax OS",
  openGraph: {
    title: "Axionax OS",
    description:
      "Obsidian command center for Axionax validators and DeAI workloads.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Axionax OS",
    description:
      "Obsidian command center for Axionax validators and DeAI workloads.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05060a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-teal-400 focus:px-4 focus:py-2 focus:text-obsidian-950 focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to content
        </a>
        <MenuBar />
        <main
          id="main-content"
          className="min-h-screen pt-12 pb-32"
          tabIndex={-1}
        >
          <div className="mx-auto max-w-5xl px-os-4 sm:px-os-6 py-os-6">
            {children}
          </div>
        </main>
        <Dock />
      </body>
    </html>
  );
}
