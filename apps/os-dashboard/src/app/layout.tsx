import "./globals.css";
import type { Metadata } from "next";
import { MenuBar } from "@/components/menu-bar";
import { Dock } from "@/components/dock";

export const metadata: Metadata = {
  title: "Axionax OS",
  description: "Self-hosted Axionax node dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <MenuBar />
        <main className="min-h-screen pt-12 pb-32">
          <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
        </main>
        <Dock />
      </body>
    </html>
  );
}
