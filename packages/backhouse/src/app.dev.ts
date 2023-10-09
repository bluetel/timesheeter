import fs from 'fs';

// See what file exists at ../../.env.* and load it, local, staging, or production
const envPath = fs.existsSync('../../.env.local')
  ? '../../.env.local'
  : fs.existsSync('../../.env.staging')
  ? '../../.env.staging'
  : '../../.env.production';

import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: envPath });

import { type IntegrationJob, connectionConfig, env } from '@timesheeter/web';
import { Worker, Queue } from 'bullmq';
import { handleIntegrationsJob } from '@timesheeter/backhouse/integrations';
import fastify from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { checkSchedule } from './check-schedule';

console.log('Starting Backhouse Worker');

// Ensure valid integrations are in the schedule, Elasticache is not persistent
checkSchedule().catch((error) => {
  console.error('Error in checkSchedule', error);
  throw new Error('Error in checkSchedule, exiting');
});

const worker = new Worker<IntegrationJob>('integrations', handleIntegrationsJob, {
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

(async () => {
  await bullBoardApp.register(serverAdapter.registerPlugin());
  await bullBoardApp.listen({ port: env.BULL_BOARD_PORT, host: '0.0.0.0' });
})().catch((error) => {
  console.error('Error in BullBoard', error);
});

console.log(`BullBoard running on http://0.0.0.0:${env.BULL_BOARD_PORT}`);
