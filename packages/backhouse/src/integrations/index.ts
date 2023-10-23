import { type IntegrationJob, getPrismaClient, parseIntegration } from '@timesheeter/web';
import { handleTogglIntegration } from './toggl';
import { handleV1JiraIntegration, handleV2JiraIntegration } from './jira';
import { handleGoogleSheetsIntegration } from './google-sheets';

export const handleIntegrationsJob = async (integrationJob: IntegrationJob) => {
  await handleIntegrationsJobThrowable(integrationJob).catch((error) => {
    console.error('Error in handleIntegrationsJob', error);
  });
};

const handleIntegrationsJobThrowable = async (integrationJob: IntegrationJob) => {
  const { integrationId } = integrationJob;
  console.log('Processing integration', integrationId);

  const prisma = await getPrismaClient();

  const integration = await prisma.integration
    .findUnique({
      where: {
        id: integrationId,
      },
    })
    .then((integration) => {
      if (!integration) {
        throw new Error(`Integration with id ${integrationId} not found`);
      }

      return parseIntegration(integration, false);
    });

  if (integration.config.type === 'TogglIntegration') {
    integration.config;
    await handleTogglIntegration({
      integration: {
        ...integration,
        config: integration.config,
      },
    });
  } else if (integration.config.type === 'JiraIntegration') {
    await handleV1JiraIntegration({
      integration: {
        ...integration,
        config: integration.config,
      },
    });
  } else if (integration.config.type === 'JiraIntegrationV2') {
    await handleV2JiraIntegration({
      integration: {
        ...integration,
        config: integration.config,
      },
    });
  } else if (integration.config.type === 'GoogleSheetsIntegration') {
    await handleGoogleSheetsIntegration({
      integration: {
        ...integration,
        config: integration.config,
      },
    });
  }
};
