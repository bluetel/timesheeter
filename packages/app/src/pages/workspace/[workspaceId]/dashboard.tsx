import {
  type InferGetServerSidePropsType,
  type GetServerSidePropsContext,
} from "next";
import { useRouter } from "next/router";
import { StartingPointsEmptyState } from "@timesheeter/app/components/ui/StartingPointsEmptyState";
import { WorkspaceLayout } from "@timesheeter/app/components/workspace/WorkspaceLayout";
import { INTEGRATIONS_HELP_TEXT } from "@timesheeter/app/lib/workspace/integrations";
import { MODELS_HELP_TEXT } from "@timesheeter/app/lib/workspace/models";
import { TOOLS_HELP_TEXT } from "@timesheeter/app/lib/workspace/tools";
import { prisma } from "@timesheeter/app/server/db";
import { getWorkspaceInfo } from "@timesheeter/app/server/lib/workspace-info";
import { IntegrationIcon, ModelIcon, ToolIcon } from "@timesheeter/app/styles/icons";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const workspaceInfo = await getWorkspaceInfo(context);

  if ("redirect" in workspaceInfo) {
    return { redirect: workspaceInfo.redirect };
  }

  const [toolsCount, modelsCount, integrationsCount] = await Promise.all([
    prisma.tool.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
      },
    }),
    prisma.model.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
      },
    }),
    prisma.integration.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
      },
    }),
  ]);

  return {
    props: {
      workspaceInfo: workspaceInfo.props,
      toolsCount,
      modelsCount,
      integrationsCount,
    },
  };
};

const Dashboard = ({
  workspaceInfo,
  toolsCount,
  modelsCount,
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
              title: "Create a new Model",
              description: MODELS_HELP_TEXT,
              icon: ModelIcon,
              background: "bg-purple-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/models?create=true`
                ),
              countDetail: {
                count: modelsCount,
                label: modelsCount === 1 ? "Model" : "Models",
              },
            },
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
              title: "Create a new Tool",
              description: TOOLS_HELP_TEXT,
              icon: ToolIcon,
              background: "bg-yellow-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/tools?create=true`
                ),
              countDetail: {
                count: toolsCount,
                label: toolsCount === 1 ? "Tool" : "Tools",
              },
            },
          ]}
        />
      </div>
    </WorkspaceLayout>
  );
};

export default Dashboard;
