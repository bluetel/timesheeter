import { type IntegrationJob, getPrismaClient, parseIntegration } from '@timesheeter/web';
import { parseCronExpression } from '@harrytwigg/cron-schedule';

export const determineExecution = async (): Promise<IntegrationJob[]> => {
  const prisma = await getPrismaClient();

  const integrations = await prisma.integration
    .findMany({})
    .then((integrations) => integrations.map((integration) => parseIntegration(integration, false)));

  // Correct time so we get the correct evaluation
  const correctedTime = new Date();

  // set the seconds and milliseconds to 0
  correctedTime.setUTCSeconds(0);
  correctedTime.setUTCMilliseconds(0);

  const integrationJobs = integrations.map((integration) => {
    const { chronExpression } = integration.config;
    const cron = parseCronExpression(chronExpression);

    return cron.matchDate(correctedTime)
      ? {
          integrationId: integration.id,
        }
      : null;
  });

  return integrationJobs.filter((integrationJob) => !!integrationJob) as IntegrationJob[];
};
