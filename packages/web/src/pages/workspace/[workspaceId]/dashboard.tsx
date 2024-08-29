import {
  type InferGetServerSidePropsType,
  type GetServerSidePropsContext,
} from "next";
import { useRouter } from "next/router";
import { StartingPointsEmptyState } from "@timesheeter/web/components/ui/StartingPointsEmptyState";
import { WorkspaceLayout } from "@timesheeter/web/components/workspace/WorkspaceLayout";
import { INTEGRATIONS_HELP_TEXT } from "@timesheeter/web/lib/workspace/integrations";
import { getPrismaClient } from "@timesheeter/web/server/db";
import { getWorkspaceInfo } from "@timesheeter/web/server/lib/workspace-info";
import {
  INVITATIONS_HELP_TEXT,
  IntegrationIcon,
  MEMBERSHIPS_HELP_TEXT,
  PROJECTS_HELP_TEXT,
  ProjectIcon,
  TASKS_HELP_TEXT,
  TIMESHEET_ENTRIES_HELP_TEXT,
  TaskIcon,
  TimesheetEntryIcon,
} from "@timesheeter/web/lib";
import { useState } from "react";
import { EditWorkspaceSideOver } from "@timesheeter/web/components/workspace/management/EditWorkspaceSideOver";
import { useRefetchServersideProps } from "@timesheeter/web/utils/refetch-serverside-props";
import { UserList } from "@timesheeter/web/components/UserList";
import { InviteLinkPanel } from "@timesheeter/web/components/workspace/management/InviteLinkPanel";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const prisma = await getPrismaClient();

  const workspaceInfo = await getWorkspaceInfo(context);

  if ("redirect" in workspaceInfo) {
    return { redirect: workspaceInfo.redirect };
  }

  const [integrationsCount, projectsCount, tasksCount, timesheetEntriesCount] =
    await Promise.all([
      prisma.integration.count({
        where: {
          workspaceId: workspaceInfo.props.workspace.id,
          OR: [
            {
              privateUserId: null,
            },
            {
              privateUserId: workspaceInfo.props.membership.user.id,
            },
          ],
        },
      }),
      prisma.project.count({
        where: {
          workspaceId: workspaceInfo.props.workspace.id,
          deleted: false,
        },
      }),
      prisma.task.count({
        where: {
          workspaceId: workspaceInfo.props.workspace.id,
          OR: [
            {
              scopedUserId: null,
            },
            {
              scopedUserId: workspaceInfo.props.membership.user.id,
            },
          ],
          deleted: false,
        },
      }),
      prisma.timesheetEntry.count({
        where: {
          workspaceId: workspaceInfo.props.workspace.id,
          userId: workspaceInfo.props.membership.user.id,
          deleted: false,
        },
      }),
      // prisma.holidays.count({
      //   where: {
      //     workspaceId: workspaceInfo.props.workspace.id,
      //     userId: workspaceInfo.props.membership.user.id,
      //   },
      // }),
    ]);

  return {
    props: {
      workspaceInfo: workspaceInfo.props,
      integrationsCount,
      projectsCount,
      tasksCount,
      timesheetEntriesCount,
    },
  };
};

const Dashboard = ({
  workspaceInfo,
  integrationsCount,
  projectsCount,
  tasksCount,
  timesheetEntriesCount,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { push } = useRouter();

  const [showEditWorkspaceSideOver, setShowEditWorkspaceSideOver] =
    useState(false);

  const refetchSeverSideProps = useRefetchServersideProps();

  return (
    <>
      <EditWorkspaceSideOver
        refetchWorkspaces={refetchSeverSideProps}
        show={showEditWorkspaceSideOver}
        onClose={() => setShowEditWorkspaceSideOver(false)}
        data={{
          new: false,
          workspace: workspaceInfo.workspace,
          memberships: workspaceInfo.memberships,
          invitations: workspaceInfo.invitations,
        }}
      />
      <WorkspaceLayout workspaceInfo={workspaceInfo}>
        <div className="p-16 flex flex-col gap-16">
          <InviteLinkPanel workspaceId={workspaceInfo.workspace.id} />
          <StartingPointsEmptyState
            header={{
              title: workspaceInfo.workspace.name,
              description:
                "Get started with one of our recommended actions below.",
              newButton: {
                label: "Edit workspace and members",
                onClick: () => setShowEditWorkspaceSideOver(true),
              },
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
                  label:
                    integrationsCount === 1 ? "Integration" : "Integrations",
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
              // {
              //   title: 'Log a new time off',
              //   description: TIME_OFF_HELP_TEXT,
              //   icon: TimeOffIcon,
              //   background: 'bg-yellow-500',
              //   onClick: () => push(`/workspace/${workspaceInfo.workspace.id}/times-off?create=true`),
              //   countDetail: {
              //     count: timeOffCount,
              //     label: timeOffCount === 1 ? 'Time Off' : 'Times Off',
              //   },
              // },
            ]}
          />
          <div className="mt-6 grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
            <div>
              <UserList
                users={workspaceInfo.memberships.map((m) => ({
                  name: m.user.name ?? "Unknown",
                  email: m.user.email ?? undefined,
                  imageUrl: m.user.image ?? undefined,
                }))}
                title="Workspace members"
                subtitle={MEMBERSHIPS_HELP_TEXT}
                emptyText="No members yet."
              />
            </div>
            <div>
              <UserList
                users={workspaceInfo.invitations.map((i) => ({
                  name: i.email,
                  email: undefined,
                  imageUrl: undefined,
                }))}
                title="Workspace invitations"
                subtitle={INVITATIONS_HELP_TEXT}
                emptyText="No invitations yet."
              />
            </div>
          </div>
        </div>
      </WorkspaceLayout>
    </>
  );
};

export default Dashboard;
