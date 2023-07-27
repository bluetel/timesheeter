import { getPrismaClient, integrationsQueue, parseIntegration } from '@timesheeter/web';

export const checkSchedule = async () => {
  const prisma = await getPrismaClient();

  const storedIntegrations = (
    await prisma.integration
      .findMany()
      .then((integrations) => integrations.map((integration) => parseIntegration(integration, false)))
  ).filter((integration) => integration.repeatJobKey);

  const currentRepeatableJobs = await integrationsQueue.getRepeatableJobs().then((jobs) => jobs.map((job) => job.key));

  const integrationsNotInSchedule = storedIntegrations.filter(
    (integration) => !currentRepeatableJobs.includes(integration.repeatJobKey as string)
  );

  const integrationsToRemove = currentRepeatableJobs.filter(
    (jobKey) => !storedIntegrations.find((integration) => integration.repeatJobKey === jobKey)
  ) as string[];

  if (integrationsNotInSchedule.length > 0) {
    await Promise.all(
      integrationsNotInSchedule.map((integration) =>
        integrationsQueue.add(
          'processIntegration',
          {
            integrationId: integration.id,
          },
          {
            repeat: {
              pattern: integration.config.chronExpression,
            },
            jobId: `integration-${integration.id}-jobId`,
            repeatJobKey: `integration-${integration.id}-repeatJobKey`,
          }
        )
      )
    );
  }

  if (integrationsToRemove.length > 0) {
    await Promise.all(integrationsToRemove.map((jobKey) => integrationsQueue.removeRepeatableByKey(jobKey)));
  }
};
