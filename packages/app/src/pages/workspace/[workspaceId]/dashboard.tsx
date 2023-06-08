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
import { IntegrationIcon } from "@timesheeter/app/styles/icons";
import { CONNECTORS_HELP_TEXT } from "dist/lib/workspace/connectors";
import { ConnectorIcon } from "dist/styles/icons";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const workspaceInfo = await getWorkspaceInfo(context);

  if ("redirect" in workspaceInfo) {
    return { redirect: workspaceInfo.redirect };
  }

  const [integrationsCount, connectorsCount] = await Promise.all([
    prisma.integration.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
        userId: workspaceInfo.props.user.id,
      },
    }),
    prisma.connector.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
      },
    }),
  ]);

  return {
    props: {
      workspaceInfo: workspaceInfo.props,
      integrationsCount,
      connectorsCount
    },
  };
};

const Dashboard = ({
  workspaceInfo,
  integrationsCount,
  connectorsCount
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
            {
              title: "Create a new Connector",
              description: CONNECTORS_HELP_TEXT,
              icon: ConnectorIcon,
              background: "bg-blue-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/connectors?create=true`
                ),
              countDetail: {
                count: connectorsCount,
                label: connectorsCount === 1 ? "Connector" : "Connectors",
              },
            }
          ]}
        />
      </div>
    </WorkspaceLayout>
  );
};

export default Dashboard;
