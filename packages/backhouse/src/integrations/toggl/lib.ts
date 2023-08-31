import { ParsedIntegration, PrismaClient, getPrismaClient } from '@timesheeter/web';
import { RateLimitedAxiosClient, TogglUser, getAxiosClient, toggl } from './api';
import { EmailMapEntry } from '@timesheeter/web';

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
  startDate: Date;
  endDate: Date;
};

export const createTogglIntegrationContext = async ({
  apiKey,
  unverifiedTogglWorkspaceId,
  workspaceId,
  emailMap,
  scanPeriod,
}: {
  apiKey: string;
  unverifiedTogglWorkspaceId: number | null;
  workspaceId: string;
  emailMap: EmailMapEntry[];
  scanPeriod: number;
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

  const togglIdToEmail = togglUsers.reduce((acc, user) => {
    acc[user.id] = user.email;
    return acc;
  }, {} as Record<number, string>);

  const timesheeterUserIdToEmail = workspaceUsers.reduce((acc, user) => {
    if (!user.email) {
      console.warn(`Toggl integration: User ${user.id} has no email`);
      return acc;
    }

    let userEmail = user.email;

    // See if we have a mapping for this user
    const emailMapEntry = emailMap.find((entry) => entry.userId === user.id);

    if (emailMapEntry) {
      userEmail = emailMapEntry.togglEmail;
    }

    acc[user.id] = userEmail;
    return acc;
  }, {} as Record<string, string>);

  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - scanPeriod);
  startDate.setUTCHours(0, 0, 0, 0);

  return {
    axiosClient,
    prisma,
    togglWorkspaceId: verifiedTogglWorkspaceId,
    workspaceId,
    togglUsers,
    togglIdToEmail,
    timesheeterUserIdToEmail,
    startDate,
    endDate,
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
