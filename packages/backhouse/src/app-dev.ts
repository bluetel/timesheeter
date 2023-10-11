import fs from 'fs';

console.log('Starting Dev Backhouse Worker');

// See what file exists at ../../.env.* and load it, local, staging, or production
const envPath = fs.existsSync('../../.env.local')
  ? '../../.env.local'
  : fs.existsSync('../../.env.staging')
  ? '../../.env.staging'
  : '../../.env.production';

import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: envPath });

import { type IntegrationJob, connectionConfig, env } from '@timesheeter/web';
import { Worker, Queue, type Job } from 'bullmq';
import { handleIntegrationsJob } from '@timesheeter/backhouse/integrations';
import fastify from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { checkSchedule } from './check-schedule';

const runIntegrationJobDev = async (wrappedIntegrationJob: Job<IntegrationJob>) =>
  handleIntegrationsJob(wrappedIntegrationJob.data);

(async () => {
  // Ensure valid integrations are in the schedule, Elasticache is not persistent
  await checkSchedule();

  const worker = new Worker<IntegrationJob>('integrations', runIntegrationJobDev, {
    connection: connectionConfig,
    concurrency: 10,
  });

  // Error handler is required to prevent unhandled errors from crashing the worker
  worker.on('error', (error) => {
    // log the error
    console.error('Error in worker', error);
  });

  const bullBoardApp = fastify();
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [
      new BullMQAdapter(
        new Queue('integrations', {
          connection: connectionConfig,
        })
      ),
    ],
    serverAdapter,
  });

  await bullBoardApp.register(serverAdapter.registerPlugin());
  await bullBoardApp.listen({ port: env.BULL_BOARD_PORT, host: '0.0.0.0' });

  console.log(`BullBoard running on http://0.0.0.0:${env.BULL_BOARD_PORT}`);
})().catch((error) => {
  throw error;
});
