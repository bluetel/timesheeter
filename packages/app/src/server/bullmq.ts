import { Queue, RedisConnection } from "bullmq";
import { env } from "@timesheeter/app/env";

export const connectionConfig = {
  host: env.BULLMQ_REDIS_HOST,
  port: parseInt(env.BULLMQ_REDIS_PORT),
  password: env.BULLMQ_REDIS_PASSWORD,
} as const;

const queueConfig = {
  connection: connectionConfig,
} as const;

export type IntegrationJob = {
  integrationId: string;
};

export const integrationsQueue = new Queue<IntegrationJob, unknown>(
  "integrations",
  queueConfig,
  RedisConnection
);

export type ConnectorJob = {
  connectorId: string;
};

export const connectorsQueue = new Queue<ConnectorJob, unknown>(
  "connectors",
  queueConfig,
  RedisConnection
);
