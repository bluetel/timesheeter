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
  togglIdToEmail: Record<number, string>;
  timesheeterUserIdToEmail: Record<string, string>;
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

  const workspaceUsers = await prisma.membership
    .findMany({
      where: {
        workspaceId,
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })
    .then((memberships) => memberships.map((membership) => membership.user));

  return {
    axiosClient,
    prisma,
    togglWorkspaceId: verifiedTogglWorkspaceId,
    workspaceId,
    togglUsers,
    togglIdToEmail: togglUsers.reduce((acc, user) => {
      acc[user.id] = user.email;
      return acc;
    }, {} as Record<number, string>),
    timesheeterUserIdToEmail: workspaceUsers.reduce((acc, user) => {
      if (!user.email) {
        console.warn(`Toggl integration: User ${user.id} has no email`);
        return acc;
      }

      acc[user.id] = user.email;
      return acc;
    }, {} as Record<string, string>),
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
