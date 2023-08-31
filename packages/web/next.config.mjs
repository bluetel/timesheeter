import fs from 'fs';

// See what file exists at ../../.env.* and load it, local, staging, or production
const envPath = fs.existsSync('../../.env.local')
  ? '../../.env.local'
  : fs.existsSync('../../.env.staging')
    ? '../../.env.staging'
    : '../../.env.production';

import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: envPath });

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /**
   * If you have the "experimental: { appDir: true }" setting enabled, then you
   * must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};
export default config;
