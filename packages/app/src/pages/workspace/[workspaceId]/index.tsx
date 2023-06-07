import { type Membership, type Workspace } from "@prisma/client";
import { type GetServerSideProps, type GetServerSidePropsContext } from "next";
import { type User } from "next-auth";

export const getServerSideProps = async ({
  params,
}: GetServerSidePropsContext) => {
  if (!params?.workspaceId || typeof params.workspaceId !== "string") {
    return {
      redirect: {
        destination: "/find-workspace",
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: `/workspace/${params?.workspaceId}/dashboard`,
      permanent: false,
    },
  };
};

const Index = () => {
  return null;
};

export default Index;
