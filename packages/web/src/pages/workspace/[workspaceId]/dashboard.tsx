import {
  type InferGetServerSidePropsType,
  type GetServerSidePropsContext,
} from "next";
import { useRouter } from "next/router";
import { StartingPointsEmptyState } from "@timesheeter/web/components/ui/StartingPointsEmptyState";
import { WorkspaceLayout } from "@timesheeter/web/components/workspace/WorkspaceLayout";
import { INTEGRATIONS_HELP_TEXT } from "@timesheeter/web/lib/workspace/integrations";
import { prisma } from "@timesheeter/web/server/db";
import { getWorkspaceInfo } from "@timesheeter/web/server/lib/workspace-info";
import {
  HOLIDAYS_HELP_TEXT,
  HolidayIcon,
  IntegrationIcon,
  PROJECTS_HELP_TEXT,
  ProjectIcon,
  TASKS_HELP_TEXT,
  TIMESHEET_ENTRIES_HELP_TEXT,
  TaskIcon,
  TimesheetEntryIcon,
} from "@timesheeter/web/lib";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const workspaceInfo = await getWorkspaceInfo(context);

  if ("redirect" in workspaceInfo) {
    return { redirect: workspaceInfo.redirect };
  }

  const [
    integrationsCount,
    projectsCount,
    tasksCount,
    timesheetEntriesCount,
    holidaysCount,
  ] = await Promise.all([
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
    prisma.task.count({
      where: {
        workspaceId: workspaceInfo.props.workspace.id,
      },
    }),
    prisma.timesheetEntry.count({
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
      tasksCount,
      timesheetEntriesCount,
      holidaysCount,
    },
  };
};

const Dashboard = ({
  workspaceInfo,
  integrationsCount,
  projectsCount,
  tasksCount,
  timesheetEntriesCount,
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
              title: "Create a new integration",
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
              title: "Create a new project",
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
              title: "Create a new task",
              description: TASKS_HELP_TEXT,
              icon: TaskIcon,
              background: "bg-purple-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/tasks?create=true`
                ),
              countDetail: {
                count: tasksCount,
                label: tasksCount === 1 ? "Task" : "Tasks",
              },
            },
            {
              title: "Log a new timesheet entry",
              description: TIMESHEET_ENTRIES_HELP_TEXT,
              icon: TimesheetEntryIcon,
              background: "bg-red-500",
              onClick: () =>
                push(
                  `/workspace/${workspaceInfo.workspace.id}/timesheet-entries?create=true`
                ),
              countDetail: {
                count: timesheetEntriesCount,
                label:
                  timesheetEntriesCount === 1
                    ? "Timesheet Entry"
                    : "Timesheet Entries",
              },
            },
            {
              title: "Declare a new holiday",
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
