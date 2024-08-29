import type { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@timesheeter/web/server/auth";
import { getPrismaClient } from "@timesheeter/web/server/db";
import { env } from "@timesheeter/web/env";

export const getServerSideProps = async ({
  req,
  res,
  params,
}: GetServerSidePropsContext) => {
  const workspaceId = params?.workspaceId;
  if (!workspaceId || typeof workspaceId !== "string") {
    return {
      props: {
        message: "workspaceId is required",
      },
    };
  }

  const session = await getServerSession(req, res, await getAuthOptions());
  if (!session) {
    const callbackUrl = new URL(
      `/accept-invitation-workspace/${workspaceId}`,
      env.NEXT_PUBLIC_URL
    );

    return {
      redirect: {
        destination: `/login?callbackUrl=${callbackUrl}`,
        permanent: false,
      },
    };
  }

  const prisma = await getPrismaClient();

  // If User is already a member of the workspace, redirect to workspace
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      workspaceId,
    },
  });
  if (membership) {
    return {
      redirect: {
        destination: `/workspace/${workspaceId}`,
        permanent: false,
      },
    };
  }

  if (!session.user.email) {
    return {
      props: {
        message:
          "You need to have an email registered to accept the invitation.",
      },
    };
  }

  // Find invitation
  const invitation = await prisma.invitation.findFirst({
    where: {
      workspaceId,
      email: session.user.email,
    },
  });

  if (!invitation) {
    return {
      props: {
        message:
          "Invitation not found, if you think you should have one, please contact the workspace owner",
      },
    };
  }

  // Create workspace membership
  await prisma.membership.create({
    data: {
      role: "member",
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
      id: workspaceId,
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
