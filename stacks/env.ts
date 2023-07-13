import { z } from 'zod';

// SST Build Environment Variables
const sstEnvSchema = z.object({
  IS_PRODUCTION: z.boolean().default(false),
  APP_NAME: z.string().default('timesheeter'),
  NEXTAUTH_URL: z.string().default('http://localhost:6020'),
});

export const sstEnv = sstEnvSchema.parse(process.env);
