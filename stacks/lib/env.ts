import { z } from 'zod';

// SST Build Environment Variables, a lot of these will also be the NextJS app
const sstEnvSchema = z.object({
  IS_LOCAL: z.boolean().default(false),
  APP_NAME: z.string().default('timesheeter'),
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

  BULL_BOARD_PORT: z
    .string()
    .default('9999')
    .transform((s) => parseInt(s, 10))
    .pipe(z.number()),

  RESEND_API_KEY: z.string().min(1),

  HOSTED_ZONE: z.string().min(1),
});

export const sstEnv = sstEnvSchema.parse(process.env);
