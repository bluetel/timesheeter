import type { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@timesheeter/web/server/auth";
import { prisma } from "@timesheeter/web/server/db";

export const getServerSideProps = async ({
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
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
  const ownerMembership = memberships.find(
    (membership) => membership.role === "owner"
  );

  if (ownerMembership) {
    return {
      redirect: {
        destination: `/workspace/${ownerMembership.workspaceId}`,
        permanent: false,
      },
    };
  }

  const newWorkspace = await prisma.workspace.create({
    data: {
      name: session.user.name
        ? `${session.user.name}'s Workspace`
        : "My Workspace",
      memberships: {
        create: {
          user: {
            connect: {
              id: session.user.id,
            },
          },
          role: "owner",
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
