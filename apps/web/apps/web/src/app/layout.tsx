import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/contexts/Web3Context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryProvider } from '@/providers/QueryProvider';
import ExplorerLayout from '@/components/layout/ExplorerLayout';
import { OracleChatMount } from '@/components/oracle/OracleChatMount';

// Body & UI – neutral, readable (Phase 1: tech typography)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Headings – geometric, tech feel
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['500', '600', '700'],
});

// Technical data – addresses, hashes, block height, chain ID
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Axionax Protocol | Trusted World Computer',
  description:
    'Layer-1 blockchain for decentralized AI compute. Math-based trust, PoPC consensus, and the path to Project Monolith.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png?v=2',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Axionax Protocol | Trusted World Computer',
    description:
      'Layer-1 blockchain for decentralized AI compute. Math-based trust, PoPC consensus.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased text-base font-normal">
        <ThemeProvider>
          <QueryProvider>
            <Web3Provider>
              <ExplorerLayout>{children}</ExplorerLayout>
            </Web3Provider>
          </QueryProvider>
        </ThemeProvider>
        <OracleChatMount />
      </body>
    </html>
  );
}
