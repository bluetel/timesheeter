import {
  type InferGetServerSidePropsType,
  type GetServerSidePropsContext,
} from "next";
import { useRouter } from "next/router";
import { StartingPointsEmptyState } from "@timesheeter/app/components/ui/StartingPointsEmptyState";
import { WorkspaceLayout } from "@timesheeter/app/components/workspace/WorkspaceLayout";
import { INTEGRATIONS_HELP_TEXT } from "@timesheeter/app/lib/workspace/integrations";
import { prisma } from "@timesheeter/app/server/db";
import { getWorkspaceInfo } from "@timesheeter/app/server/lib/workspace-info";
import { IntegrationIcon } from "@timesheeter/app/lib";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const workspaceInfo = await getWorkspaceInfo(context);

  if ("redirect" in workspaceInfo) {
    return { redirect: workspaceInfo.redirect };
  }

  const [integrationsCount] = await Promise.all([
    prisma.integration.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
        userId: workspaceInfo.props.user.id,
      },
    }),
  ]);

  return {
    props: {
      workspaceInfo: workspaceInfo.props,
      integrationsCount,
    },
  };
};

const Dashboard = ({
  workspaceInfo,
  integrationsCount,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { push } = useRouter();

  return (
    <WorkspaceLayout workspaceInfo={workspaceInfo}>
      <div className="p-16">
        <StartingPointsEmptyState
          header={{
            title: "Welcome to your workspace!",
            description:
              "Get started with one of our recommended actions below.",
          }}
          items={[
            {
              title: "Create a new Integration",
              description: INTEGRATIONS_HELP_TEXT,
              icon: IntegrationIcon,
              background: "bg-green-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/integrations?create=true`
                ),
              countDetail: {
                count: integrationsCount,
                label: integrationsCount === 1 ? "Integration" : "Integrations",
              },
            },
          ]}
        />
      </div>
    </WorkspaceLayout>
  );
};

export default Dashboard;
