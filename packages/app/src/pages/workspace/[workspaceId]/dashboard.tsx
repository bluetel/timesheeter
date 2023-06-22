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
import {
  HOLIDAYS_HELP_TEXT,
  HolidayIcon,
  IntegrationIcon,
  PROJECTS_HELP_TEXT,
  ProjectIcon,
} from "@timesheeter/app/lib";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const workspaceInfo = await getWorkspaceInfo(context);

  if ("redirect" in workspaceInfo) {
    return { redirect: workspaceInfo.redirect };
  }

  const [integrationsCount, projectsCount, holidaysCount] = await Promise.all([
    prisma.integration.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
        userId: workspaceInfo.props.user.id,
      },
    }),
    prisma.project.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
      },
    }),
    prisma.holiday.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
      },
    }),
  ]);

  return {
    props: {
      workspaceInfo: workspaceInfo.props,
      integrationsCount,
      projectsCount,
      holidaysCount,
    },
  };
};

const Dashboard = ({
  workspaceInfo,
  integrationsCount,
  projectsCount,
  holidaysCount,
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
              title: "Create a new Project",
              description: PROJECTS_HELP_TEXT,
              icon: ProjectIcon,
              background: "bg-blue-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/projects?create=true`
                ),
              countDetail: {
                count: projectsCount,
                label: projectsCount === 1 ? "Project" : "Projects",
              },
            },
            {
              title: "Declare a new Holiday",
              description: HOLIDAYS_HELP_TEXT,
              icon: HolidayIcon,
              background: "bg-yellow-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/holidays?create=true`
                ),
              countDetail: {
                count: holidaysCount,
                label: holidaysCount === 1 ? "Holiday" : "Holidays",
              },
            },
          ]}
        />
      </div>
    </WorkspaceLayout>
  );
};

export default Dashboard;
