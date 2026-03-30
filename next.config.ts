import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/landing',
        destination: '/landing/index.html',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
