import type { GetServerSidePropsContext } from 'next';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@timesheeter/web/server/auth';
import { getPrismaClient } from '@timesheeter/web/server/db';

export const getServerSideProps = async ({ req, res }: GetServerSidePropsContext) => {
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

  if (!session.user.email) {
    throw new Error('User email is required');
  }

  const acceptedInvitations = await prisma.invitation.findMany({
    where: {
      email: session.user.email,
      accepted: true,
    },
  });

  // Create new memberships for accepted invitations
  const newMemberships = await Promise.all(
    acceptedInvitations.map(async (invitation) =>
      prisma.membership.create({
        data: {
          role: 'member',
          user: {
            connect: {
              id: session.user.id,
            },
          },
          workspace: {
            connect: {
              id: invitation.workspaceId,
            },
          },
        },
        select: {
          workspaceId: true,
          role: true,
        },
      })
    )
  );

  await prisma.invitation.deleteMany({
    where: {
      id: {
        in: acceptedInvitations.map((invitation) => invitation.id),
      },
    },
  });

  if (newMemberships[0]) {
    return {
      redirect: {
        destination: `/workspace/${newMemberships[0].workspaceId}`,
        permanent: false,
      },
    };
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      workspaceId: true,
      role: true,
    },
  });

  // Find one where role is owner
  const ownerMembership = memberships.find((membership) => membership.role === 'owner');

  if (ownerMembership) {
    return {
      redirect: {
        destination: `/workspace/${ownerMembership.workspaceId}`,
        permanent: false,
      },
    };
  }

  // If no owner membership found, return first membership
  if (memberships[0]) {
    return {
      redirect: {
        destination: `/workspace/${memberships[0].workspaceId}`,
        permanent: false,
      },
    };
  }

  const newWorkspace = await prisma.workspace.create({
    data: {
      name: session.user.name ? `${session.user.name}'s Workspace` : 'My Workspace',
      memberships: {
        create: {
          user: {
            connect: {
              id: session.user.id,
            },
          },
          role: 'owner',
        },
      },
    },
  });

  return {
    redirect: {
      destination: `/workspace/${newWorkspace.id}`,
      permanent: false,
    },
  };
};

const FindWorkspace = () => {
  return <></>;
};

export default FindWorkspace;
