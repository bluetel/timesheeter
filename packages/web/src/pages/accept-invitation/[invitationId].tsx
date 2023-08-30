import type { GetServerSidePropsContext } from 'next';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@timesheeter/web/server/auth';
import { getPrismaClient } from '@timesheeter/web/server/db';

export const getServerSideProps = async ({ req, res, params }: GetServerSidePropsContext) => {
  const prisma = await getPrismaClient();

  const invitationId = params?.invitationId;

  if (!invitationId || typeof invitationId !== 'string') {
    return {
      props: {
        message: 'invitationId is required',
      },
    };
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
    },
  });

  if (!invitation) {
    return {
      props: {
        message: 'Invitation not found',
      },
    };
  }

  const session = await getServerSession(req, res, await getAuthOptions());

  if (!session) {
    // Update to acceped and redirect to login
    await prisma.invitation.update({
      where: {
        id: invitationId,
      },
      data: {
        accepted: true,
      },
    });

    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Create workspace membership
  await prisma.membership.create({
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
  });

  // Delete invitation
  await prisma.invitation.delete({
    where: {
      id: invitationId,
    },
  });

  return {
    redirect: {
      destination: `/workspace/${invitation.workspaceId}`,
      permanent: false,
    },
  };
};

type AcceptInvitationProps = {
  message: string;
};

const AcceptInvitation = ({ message }: AcceptInvitationProps) => (
  <div>
    <h1>Invitation acceptance failed</h1>
    <p>{message}</p>
  </div>
);

export default AcceptInvitation;
