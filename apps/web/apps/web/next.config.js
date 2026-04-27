const path = require('path');

/**
 * Next.js Configuration for axionax Web
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Use server mode so /api/* routes work. For static-only deploy, use a separate API or remove API routes.
  // output: 'export',

  // Standalone output for VPS/CI deploy: single folder with node server (server.js)
  output: 'standalone',

  // React strict mode for catching potential issues
  reactStrictMode: true,

  // Transpile workspace packages
  transpilePackages: [
    '@axionax/blockchain-utils',
    '@axionax/sdk',
    '@axionax/ui',
  ],

  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true,
  },

  // Skip ESLint during builds (run separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    // IMPORTANT: Set to monorepo root for pnpm compatibility
    // This ensures standalone output includes correct node_modules symlinks
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },

  // Pitch: bookmarks to /pitch-deck.html → /pitch (shell + iframe).
  // Deck HTML lives at /embed/pitch-deck.html — NOT redirected — because Next
  // applies redirects before public/; iframe src /pitch-deck.html would load
  // /pitch again and duplicate ExplorerLayout (double header).
  async redirects() {
    return [
      {
        source: '/pitch-deck.html',
        destination: '/pitch',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; connect-src 'self' https: wss:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
