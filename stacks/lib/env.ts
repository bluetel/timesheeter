import { z } from "zod";

// SST Build Environment Variables, a lot of these will also be the NextJS app
const sstEnvSchema = z.object({
  IS_LOCAL: z.boolean().default(false),
  APP_NAME: z.string().default("timesheeter"),
  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1),
  CONFIG_SECRET_KEY: z.string().length(32),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  HOSTED_ZONE: z.string().min(1),

  NEXT_PUBLIC_DEV_TOOLS_ENABLED: z
    .string()
    .default("false")
    .transform((s) => s === "true"),

  /**
   * The subdomain for the app, e.g. `staging.timesheeter` or `timesheeter`
   * this can contain multiple subdomain parts
   * Note this is not the full domain e.g. `staging.timesheeter.example.com`
   * or `timesheeter.example.com`
   */
  APP_SUBDOMAIN_PARTS: z.string().min(1),
});

export const sstEnv = sstEnvSchema.parse(process.env);
