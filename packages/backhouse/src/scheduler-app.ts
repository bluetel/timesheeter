import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { type IntegrationJob, env, type ParsedIntegration } from '@timesheeter/web';
import { determineExecution } from './determine-execution';

if (!env.AWS_REGION) {
  throw new Error('AWS_REGION is not set');
}

if (!env.JOB_LAMBDA_SMALL_ARN) {
  throw new Error('JOB_LAMBDA_SMALL_ARN is not set');
}

if (!env.JOB_LAMBDA_LARGE_ARN) {
  throw new Error('JOB_LAMBDA_LARGE_ARN is not set');
}

const jobLambdaSmallArn = env.JOB_LAMBDA_SMALL_ARN;
const jobLambdaLargeArn = env.JOB_LAMBDA_LARGE_ARN;

const lambdaClient = new LambdaClient({ region: env.AWS_REGION });

const determineLambdaArn = ({ parsedIntegration }: { parsedIntegration: ParsedIntegration }): string => {
  if (parsedIntegration.config.type === 'GoogleSheetsIntegration') {
    return jobLambdaLargeArn;
  }

  return jobLambdaSmallArn;
};

const invokeIntegrationJobLambda = async (parsedIntegration: ParsedIntegration) => {
  const integrationJob: IntegrationJob = {
    integrationId: parsedIntegration.id,
  };

  const command = new InvokeCommand({
    FunctionName: determineLambdaArn({ parsedIntegration }),
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
  const parsedIntegrations = await determineExecution();

  await Promise.all(parsedIntegrations.map(invokeIntegrationJobLambda));
};
