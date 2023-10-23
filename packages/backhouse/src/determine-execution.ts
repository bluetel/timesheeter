import { getPrismaClient, parseIntegration, type ParsedIntegration } from '@timesheeter/web';
import { parseCronExpression } from '@harrytwigg/cron-schedule';

export const determineExecution = async (): Promise<ParsedIntegration[]> => {
  const prisma = await getPrismaClient();

  const parsedIntegrations = await prisma.integration
    .findMany({})
    .then((integrations) => integrations.map((integration) => parseIntegration(integration, false)));

  // Correct time so we get the correct evaluation
  const correctedTime = new Date();

  // set the seconds and milliseconds to 0
  correctedTime.setUTCSeconds(0);
  correctedTime.setUTCMilliseconds(0);

  const integrationJobs = parsedIntegrations.map((parsedIntegration) => {
    const { chronExpression } = parsedIntegration.config;
    const cron = parseCronExpression(chronExpression);

    return cron.matchDate(correctedTime) ? parsedIntegration : null;
  });

  return integrationJobs.filter((parsedIntegration) => !!parsedIntegration) as ParsedIntegration[];
};
