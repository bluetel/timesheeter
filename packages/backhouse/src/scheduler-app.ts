import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { type IntegrationJob, env } from '@timesheeter/web';
import { determineExecution } from './determine-execution';

if (!env.AWS_REGION) {
  throw new Error('AWS_REGION is not set');
}

if (!env.JOB_LAMBDA_ARN) {
  throw new Error('JOB_LAMBDA_ARN is not set');
}

const jobLambdaArn = env.JOB_LAMBDA_ARN;

const lambdaClient = new LambdaClient({ region: env.AWS_REGION });

const invokeIntegrationJobLambda = async (integrationJob: IntegrationJob) => {
  const command = new InvokeCommand({
    FunctionName: jobLambdaArn,
    InvocationType: 'Event',
    Payload: JSON.stringify(integrationJob),
  });

  await lambdaClient
    .send(command)
    .then(() => {
      console.log(`Invoked job lambda for integration ${integrationJob.integrationId}`);
    })

    .catch((error) => {
      console.error(`Error invoking job lambda for integration ${integrationJob.integrationId}`, error);
    });
};

export const scheduleIntegrations = async () => {
  // Ensure valid integrations are in the schedule, Elasticache is not persistent
  const integrationJobs = await determineExecution();

  await Promise.all(integrationJobs.map(invokeIntegrationJobLambda));
};
