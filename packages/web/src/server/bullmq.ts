import { type ConnectionOptions, Queue } from 'bullmq';
import { env } from '@timesheeter/web/env';

export const connectionConfig = {
  path: env.BULLMQ_REDIS_PATH,
} as const satisfies ConnectionOptions;

export type IntegrationJob = {
  integrationId: string;
};

export const integrationsQueue = new Queue<IntegrationJob, unknown>('integrations', {
  connection: connectionConfig,
});
