import { type GetServerSidePropsContext } from 'next';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@timesheeter/web/server/auth';
import { getPrismaClient } from '@timesheeter/web/server/db';
import { type MembershipRole } from '@timesheeter/web/lib';

type Membership = {
  id: string;
  role: MembershipRole;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type Invitation = {
  email: string;
};

export type WorkspaceInfo = {
  membership: Membership;
  workspace: {
    id: string;
    name: string;
  };
  memberships: Membership[];
  invitations: Invitation[];
};

export type WorkspaceInfoResult =
  | {
      props: WorkspaceInfo;
    }
  | {
      redirect: {
        destination: string;
        permanent: boolean;
      };
    };

export const getWorkspaceInfo = async ({
  req,
  res,
  params,
}: GetServerSidePropsContext): Promise<WorkspaceInfoResult> => {
  const prisma = await getPrismaClient();

  const session = await getServerSession(req, res, await getAuthOptions());

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  if (!params?.workspaceId || typeof params.workspaceId !== 'string') {
    return {
      redirect: {
        destination: '/find-workspace',
        permanent: false,
      },
    };
  }

  const userId = session.user.id;

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: params.workspaceId,
    },
    include: {
      memberships: {
        include: {
          user: true,
        },
      },
      invitations: true,
    },
  });

  if (!workspace) {
    return {
      redirect: {
        destination: '/find-workspace',
        permanent: false,
      },
    };
  }

  const memberships = workspace.memberships.map((membership) => ({
    id: membership.id,
    role: membership.role as MembershipRole,
    user: {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      image: membership.user.image,
    },
  }));

  const userMembership = memberships.find((membership) => membership.user.id === userId);

  if (!userMembership) {
    return {
      redirect: {
        destination: '/find-workspace',
        permanent: false,
      },
    };
  }

  return {
    props: {
      membership: userMembership,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      memberships,
      invitations: workspace.invitations.map((invitation) => ({
        email: invitation.email,
      })),
    },
  };
};

export type WorkspaceInfoResultDiscrete =
  | {
      props: WorkspaceInfo;
      redirect: null;
    }
  | {
      redirect: {
        destination: string;
        permanent: boolean;
      };
      props: null;
    };

export const getWorkspaceInfoDiscrete = async (
  context: GetServerSidePropsContext
): Promise<WorkspaceInfoResultDiscrete> => {
  const workspaceInfo = await getWorkspaceInfo(context);

  if ('redirect' in workspaceInfo) {
    return {
      ...workspaceInfo,
      props: null,
    };
  }

  return {
    ...workspaceInfo,
    redirect: null,
  };
};
