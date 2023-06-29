import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1),
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

    BULLMQ_REDIS_PASSWORD: z.string(),
    BULLMQ_REDIS_HOST: z.string(),
    BULLMQ_REDIS_PORT: z.string(),

    BULL_BOARD_PORT: z
      .string()
      .default("9999")
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
    BULLMQ_REDIS_PASSWORD: process.env.BULLMQ_REDIS_PASSWORD,
    BULLMQ_REDIS_HOST: process.env.BULLMQ_REDIS_HOST,
    BULLMQ_REDIS_PORT: process.env.BULLMQ_REDIS_PORT,
    BULL_BOARD_PORT: process.env.BULL_BOARD_PORT,
  },
});
