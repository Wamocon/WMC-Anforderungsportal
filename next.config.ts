import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites run BEFORE middleware — this prevents next-intl
      // from intercepting /landing and adding a locale prefix.
      beforeFiles: [
        { source: '/landing', destination: '/landing/index.html' },
        { source: '/landing/', destination: '/landing/index.html' },
      ],
    };
  },
};

export default withNextIntl(nextConfig);
