import { ParsedIntegration, PrismaClient, getPrismaClient } from '@timesheeter/web';
import { RateLimitedAxiosClient, TogglUser, getAxiosClient, toggl } from './api';

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
  togglUsers: TogglUser[];
};

export const createTogglIntegrationContext = async ({
  apiKey,
  unverifiedTogglWorkspaceId,
  workspaceId,
}: {
  apiKey: string;
  unverifiedTogglWorkspaceId: number | null;
  workspaceId: string;
}): Promise<TogglIntegrationContext> => {
  const prisma = await getPrismaClient();

  const axiosClient = getAxiosClient({ apiKey: apiKey });

  const verifiedTogglWorkspaceId = await getAndVerifyTogglWorkspaceId({
    axiosClient,
    unverifiedTogglWorkspaceId,
  });

  const togglUsers = await toggl.users.get({ axiosClient, path: { workspace_id: verifiedTogglWorkspaceId } });

  return {
    axiosClient,
    prisma,
    togglWorkspaceId: verifiedTogglWorkspaceId,
    workspaceId,
    togglUsers,
  };
};

const getAndVerifyTogglWorkspaceId = async ({
  axiosClient,
  unverifiedTogglWorkspaceId,
}: {
  axiosClient: ReturnType<typeof getAxiosClient>;
  unverifiedTogglWorkspaceId: number | null;
}) => {
  const me = await toggl.me.get({ axiosClient });

  if (unverifiedTogglWorkspaceId === null) {
    return me.default_workspace_id;
  }

  const workspace = me.workspaces.find((w) => w.id === unverifiedTogglWorkspaceId);

  if (!workspace) {
    throw new Error(`Could not find workspace with id ${unverifiedTogglWorkspaceId}`);
  }

  return workspace.id;
};
