import { type IntegrationJob, connectionConfig, env } from '@timesheeter/web';
import { Worker } from 'bullmq';
import { handleIntegrationsJob } from '@timesheeter/backhouse/integrations';
import { checkSchedule } from './check-schedule';

console.log('Starting Backhouse Worker');

// Ensure valid integrations are in the schedule, Elasticache is not persistent
checkSchedule();

const worker = new Worker<IntegrationJob>('integrations', handleIntegrationsJob, {
  connection: connectionConfig,
  concurrency: 10,
});

// Error handler is required to prevent unhandled errors from crashing the worker
worker.on('error', (error) => {
  // log the error
  console.error('Error in worker', error);
});
