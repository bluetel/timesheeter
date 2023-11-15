import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

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

        if (
          s ===
            'postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@${APP_DB_HOST}:${APP_DB_PORT}/${APP_DB_NAME}?schema=public&connection_limit=1' ||
          // Check for non-substituted DATABASE_URL, this occurs when building on local machine
          (typeof s === 'string' && s.includes('{'))
        ) {
          // need to reconstruct the database url from individual components
          sFormatted = undefined;
        }

        if (sFormatted) return sFormatted;

        // If is unset, substitute in from individual components
        const { APP_DB_USER, APP_DB_PASSWORD, APP_DB_HOST, APP_DB_PORT, APP_DB_NAME } = process.env;

        if (!APP_DB_USER || !APP_DB_PASSWORD || !APP_DB_HOST || !APP_DB_PORT || !APP_DB_NAME) {
          // If running in circleci, pass some dummy values
          if (process.env.CIRCLE_JOB) {
            return 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public&connection_limit=1';
          }

          throw new Error(
            'DATABASE_URL is not set and individual components are not set. Please set DATABASE_URL or APP_DB_USER, APP_DB_PASSWORD, APP_DB_HOST, APP_DB_PORT, and APP_DB_NAME.'
          );
        }

        const databaseUrl = `postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@${APP_DB_HOST}:${APP_DB_PORT}/${APP_DB_NAME}?schema=public&connection_limit=1`;

        process.env.DATABASE_URL = databaseUrl;

        return databaseUrl;
      })
      .pipe(z.string().url()),
    NODE_ENV: z.enum(['development', 'test', 'production']),
    NEXTAUTH_SECRET: z.string(),
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

    RESEND_API_KEY: z.string(),

    RESEND_FROM_EMAIL: z.string().email().default('noreply@timesheeter.pro'),

    JOB_LAMBDA_SMALL_ARN: z.unknown().transform((s) => {
      if (typeof s !== 'string') {
        return null;
      }

      return s;
    }),

    JOB_LAMBDA_MEDIUM_ARN: z.unknown().transform((s) => {
      if (typeof s !== 'string') {
        return null;
      }

      return s;
    }),

    JOB_LAMBDA_LARGE_ARN: z.unknown().transform((s) => {
      if (typeof s !== 'string') {
        return null;
      }

      return s;
    }),

    AWS_REGION: z.unknown().transform((s) => {
      if (typeof s !== 'string') {
        return null;
      }

      return s;
    }),
  },
  client: {
    NEXT_PUBLIC_URL: z.string().url(),
    NEXT_PUBLIC_DEV_TOOLS_ENABLED: z
      .string()
      .default('false')
      .transform((s) => s === 'true'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    CONFIG_SECRET_KEY: process.env.CONFIG_SECRET_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_DEV_TOOLS_ENABLED: process.env.NEXT_PUBLIC_DEV_TOOLS_ENABLED,
    JOB_LAMBDA_SMALL_ARN: process.env.JOB_LAMBDA_SMALL_ARN,
    JOB_LAMBDA_MEDIUM_ARN: process.env.JOB_LAMBDA_MEDIUM_ARN,
    JOB_LAMBDA_LARGE_ARN: process.env.JOB_LAMBDA_LARGE_ARN,
    AWS_REGION: process.env.AWS_REGION,
  },
});
