import { type GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@timesheeter/web/server/auth";
import { prisma } from "@timesheeter/web/server/db";

export type WorkspaceInfo = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  membership: {
    id: string;
    role: string;
    userId: string;
    workspaceId: string;
  };
  workspace: {
    id: string;
    name: string;
  };
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
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  if (!params?.workspaceId || typeof params.workspaceId !== "string") {
    return {
      redirect: {
        destination: "/find-workspace",
        permanent: false,
      },
    };
  }

  const userId = session.user.id;

  const membershipQuery = await prisma.membership.findFirst({
    where: {
      userId,
      workspaceId: params.workspaceId,
    },
    include: {
      workspace: true,
      user: true,
    },
  });

  if (!membershipQuery) {
    return {
      redirect: {
        destination: "/find-workspace",
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: {
        id: userId,
        name: membershipQuery.user.name,
        email: membershipQuery.user.email,
        image: membershipQuery.user.image,
      },
      membership: {
        id: membershipQuery.id,
        role: membershipQuery.role,
        userId: membershipQuery.userId,
        workspaceId: membershipQuery.workspaceId,
      },
      workspace: {
        id: membershipQuery.workspace.id,
        name: membershipQuery.workspace.name,
      },
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

  if ("redirect" in workspaceInfo) {
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
