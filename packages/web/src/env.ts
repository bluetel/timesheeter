import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';
import fs from 'fs';

// See what file exists at ../../.env.* and load it, local, staging, or production
const envPath = fs.existsSync('../../.env.local')
  ? '../../.env.local'
  : fs.existsSync('../../.env.staging')
  ? '../../.env.staging'
  : '../../.env.production';

import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: envPath });

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {
    DATABASE_URL: z
      .unknown()
      .transform((s) => {
        let sFormatted = s;

        // Check for non-substituted DATABASE_URL
        if (
          s === 'postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@${APP_DB_HOST}:${APP_DB_PORT}/${APP_DB_NAME}' ||
          (typeof s === 'string' && s.includes('{'))
        ) {
          // need to reconstruct the database url from individual components
          sFormatted = undefined;
        }

        if (sFormatted) return sFormatted;

        // If is unset, substitute in from individual components
        const { APP_DB_USER, APP_DB_PASSWORD, APP_DB_HOST, APP_DB_PORT, APP_DB_NAME } = process.env;

        if (!APP_DB_USER || !APP_DB_PASSWORD || !APP_DB_HOST || !APP_DB_PORT || !APP_DB_NAME) {
          throw new Error(
            'DATABASE_URL is not set and individual components are not set. Please set DATABASE_URL or APP_DB_USER, APP_DB_PASSWORD, APP_DB_HOST, APP_DB_PORT, and APP_DB_NAME.'
          );
        }

        const databaseUrl = `postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@${APP_DB_HOST}:${APP_DB_PORT}/${APP_DB_NAME}`;

        process.env.DATABASE_URL = databaseUrl;

        return databaseUrl;
      })
      .pipe(z.string().url()),
    NODE_ENV: z.enum(['development', 'test', 'production']),
    NEXTAUTH_SECRET: process.env.NODE_ENV === 'production' ? z.string().min(1) : z.string().min(1),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string().min(1) : z.string().url()
    ),
    CONFIG_SECRET_KEY: z.string().length(32),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    BULLMQ_REDIS_PATH: z.string(),

    BULLMQ_REDIS_PORT: z
      .string()
      .default('6379')
      .transform((s) => parseInt(s, 10)),

    BULL_BOARD_PORT: z
      .string()
      .default('9999')
      .transform((s) => parseInt(s, 10))
      .pipe(z.number()),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    CONFIG_SECRET_KEY: process.env.CONFIG_SECRET_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    BULLMQ_REDIS_PATH: process.env.BULLMQ_REDIS_PATH,
    BULLMQ_REDIS_PORT: process.env.BULLMQ_REDIS_PORT,
    BULL_BOARD_PORT: process.env.BULL_BOARD_PORT,
  },
});
