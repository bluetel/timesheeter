import { createTogglIntegrationContext, TogglIntegration } from './lib';
import { syncProjects } from './sync';

export const handleTogglIntegration = async ({
  integration: {
    config: { apiKey, togglWorkspaceId: unverifiedWorkspaceId, scanPeriod },
    workspaceId,
  },
}: {
  integration: TogglIntegration;
}) => {
  const context = await createTogglIntegrationContext({
    apiKey,
    unverifiedWorkspaceId,
    workspaceId,
  });

  const endDate = new Date();

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - scanPeriod);

  const projectPairs = await syncProjects({ context });
};
