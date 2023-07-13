import { Queue } from "bullmq";
import { env } from "@timesheeter/web/env";

export const connectionConfig = {
  host: env.BULLMQ_REDIS_HOST,
  port: parseInt(env.BULLMQ_REDIS_PORT),
  password: env.BULLMQ_REDIS_PASSWORD,
} as const;

export type IntegrationJob = {
  integrationId: string;
};

export const integrationsQueue = new Queue<IntegrationJob, unknown>(
  "integrations",
  {
    connection: connectionConfig,
  }
);
