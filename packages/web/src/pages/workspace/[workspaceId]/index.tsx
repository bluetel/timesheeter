import { type GetServerSidePropsContext } from "next";

export const getServerSideProps = ({
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
