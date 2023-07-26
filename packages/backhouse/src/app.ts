import fs from 'fs';

// See what file exists at ../../.env.* and load it, local, staging, or production
const envPath = fs.existsSync('../../.env.local')
  ? '../../.env.local'
  : fs.existsSync('../../.env.staging')
  ? '../../.env.staging'
  : '../../.env.production';

import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: envPath });

import { type IntegrationJob, connectionConfig, env, getPrismaClient, parseIntegration } from '@timesheeter/web';
import { Worker, Queue } from 'bullmq';
import { handleIntegrationsJob } from '@timesheeter/backhouse/integrations';
import fastify from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

const packageVersion = process.env.npm_package_version;

console.log(`Starting Backhouse Worker v${packageVersion}`);

const worker = new Worker<IntegrationJob>('integrations', handleIntegrationsJob, {
  connection: connectionConfig,
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
      // @ts-ignore - Types have separate declarations of a private property '_repeat'.
      new Queue('integrations', {
        connection: connectionConfig,
      })
    ),
  ],
  serverAdapter,
});

bullBoardApp.register(serverAdapter.registerPlugin());
bullBoardApp.listen({ port: env.BULL_BOARD_PORT, host: '0.0.0.0' });

console.log(`BullBoard running on http://0.0.0.0:${env.BULL_BOARD_PORT}`);

// In dev its useful to run the integration job manually like this, make sure the
// bullmq worker is commented out above

// const runDev = async () => {
//   const prisma = await getPrismaClient();
//   const integrations = await prisma.integration
//     .findMany()
//     .then((integrations) => integrations.map((integration) => parseIntegration(integration, false)));

//   // Const toggl
//   const togglIntegration = integrations.find((integration) => integration.config.type === 'JiraIntegration');

//   if (!togglIntegration || togglIntegration.config.type !== 'JiraIntegration') {
//     console.error('Toggl integration not found');
//     return;
//   }

//   console.log('Toggl integration found', togglIntegration.id);

//   //await prisma.project.deleteMany({});

//   await handleJiraIntegration({
//     integration: {
//       ...togglIntegration,
//       config: togglIntegration.config,
//     },
//   });

//   console.log('Done');
// };

// runDev();
