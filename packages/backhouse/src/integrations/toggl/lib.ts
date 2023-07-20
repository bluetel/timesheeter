import { ParsedIntegration, PrismaClient, getPrismaClient } from '@timesheeter/web';
import { RateLimitedAxiosClient, getAxiosClient, toggl } from './api';

export type TogglIntegration = ParsedIntegration & {
  config: {
    type: 'TogglIntegration';
  };
};

export type TogglIntegrationContext = {
  axiosClient: RateLimitedAxiosClient;
  prisma: PrismaClient;
  togglWorkspaceId: number;
  workspaceId: string;
};

export const createTogglIntegrationContext = async ({
  apiKey,
  unverifiedWorkspaceId,
  workspaceId,
}: {
  apiKey: string;
  unverifiedWorkspaceId: number | null;
  workspaceId: string;
}): Promise<TogglIntegrationContext> => {
  const prisma = await getPrismaClient();

  const axiosClient = getAxiosClient({ apiKey: apiKey });

  const verifiedTogglWorkspaceId = await getAndVerifyTogglWorkspaceId({
    axiosClient,
    unverifiedWorkspaceId,
  });

  return {
    axiosClient,
    prisma,
    togglWorkspaceId: verifiedTogglWorkspaceId,
    workspaceId,
  };
};

const getAndVerifyTogglWorkspaceId = async ({
  axiosClient,
  unverifiedWorkspaceId,
}: {
  axiosClient: ReturnType<typeof getAxiosClient>;
  unverifiedWorkspaceId: number | null;
}) => {
  const me = await toggl.me.get({ axiosClient });

  if (unverifiedWorkspaceId === null) {
    return me.default_workspace_id;
  }

  const workspace = me.workspaces.find((w) => w.id === unverifiedWorkspaceId);

  if (!workspace) {
    throw new Error(`Could not find workspace with id ${unverifiedWorkspaceId}`);
  }

  return workspace.id;
};
