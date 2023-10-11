import fs from 'fs';
import * as AWS from 'aws-sdk';

// See what file exists at ../../.env.* and load it, local, staging, or production
const envPath = fs.existsSync('../../.env.local')
  ? '../../.env.local'
  : fs.existsSync('../../.env.staging')
  ? '../../.env.staging'
  : '../../.env.production';

import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: envPath });

import { type IntegrationJob, connectionConfig, env } from '@timesheeter/web';
import { type Job, Worker } from 'bullmq';
import { checkSchedule } from './check-schedule';

if (!env.AWS_REGION) {
  throw new Error('AWS_REGION is not set');
}

if (!env.JOB_LAMBDA_ARN) {
  throw new Error('JOB_LAMBDA_ARN is not set');
}

const jobLambdaArn = env.JOB_LAMBDA_ARN;

AWS.config.update({ region: env.AWS_REGION });
const lambda = new AWS.Lambda();

const invokeIntegrationJobLambda = async (wrappedIntegrationJob: Job<IntegrationJob>) => {
  const integration = wrappedIntegrationJob.data;
  console.log(`Invoking job lambda for integration ${integration.integrationId}`);

  return lambda
    .invoke(
      {
        FunctionName: jobLambdaArn,
        InvocationType: 'Event',
        Payload: JSON.stringify(integration),
      },
      (error) => {
        if (error) {
          console.error('Error invoking job lambda', error);
        } else {
          console.log(`Successfully invoked job lambda for integration ${integration.integrationId}`);
        }
      }
    )
    .promise();
};

(async () => {
  console.log('Starting Backhouse Scheduler');

  // Ensure valid integrations are in the schedule, Elasticache is not persistent
  await checkSchedule();

  const worker = new Worker<IntegrationJob>('integrations', invokeIntegrationJobLambda, {
    connection: connectionConfig,
    concurrency: 10,
  });

  // Error handler is required to prevent unhandled errors from crashing the worker
  worker.on('error', (error) => {
    // log the error
    console.error('Error in worker', error);
  });
})().catch((error) => {
  throw error;
});
