import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Compress responses for faster delivery
  compress: true,

  // Powered-by header leaks tech stack info — remove it
  poweredByHeader: false,

  // Security & caching headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'microphone=(self), camera=()' },
      ],
    },
    {
      // Cache static assets aggressively
      source: '/favicon.svg',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],

  // Optimize server component external packages
  serverExternalPackages: ['@supabase/supabase-js'],
};

export default withNextIntl(nextConfig);
