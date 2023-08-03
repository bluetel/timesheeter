import { UNCATEGORIZED_TASKS_PROJECT_NAME, parseProject } from '@timesheeter/web';
import { RawTogglProject, toggl } from '../api';
import { TogglIntegrationContext } from '../lib';
import { timesheeterProjectSelectQuery } from '../sync';
import { togglProjectSyncRecordType, togglSyncRecordSelectQuery } from '../sync-records';

export type PreSyncData = Awaited<ReturnType<typeof getPreSyncData>>;

export const getPreSyncData = async ({ context }: { context: TogglIntegrationContext }) => {
  const togglTimeEntriesPromise = toggl.timeEntries
    .get({
      axiosClient: context.axiosClient,
      params: {
        start_date: context.startDate,
        end_date: context.endDate,
      },
    })
    .then((timeEntries) => {
      const filteredEntries = timeEntries.filter(
        (timeEntry) => timeEntry.workspace_id === context.togglWorkspaceId && timeEntry.stop
      );

      // Sort filtered entries so that those with taskId and projectId are first then those with projectId and no taskId second then those with no projectId and no taskId last
      return filteredEntries.sort((a, b) => {
        if (a.project_id && b.project_id) {
          if (a.task_id && b.task_id) {
            return 0;
          }

          if (a.task_id) {
            return -1;
          }

          if (b.task_id) {
            return 1;
          }

          return 0;
        }

        if (a.project_id) {
          return -1;
        }

        if (b.project_id) {
          return 1;
        }

        return 0;
      });
    });

  const togglProjects = await toggl.projects.get({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId },
  });

  const togglTasksPromise = Promise.all(
    togglProjects.map((project) =>
      toggl.tasks.get({
        axiosClient: context.axiosClient,
        path: { workspace_id: context.togglWorkspaceId, project_id: project.id },
      })
    )
  ).then((results) => results.flat());

  const timesheeterProjectsPromise = context.prisma.project
    .findMany({
      where: {
        workspaceId: context.workspaceId,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((projects) => projects.map((project) => parseProject(project, false)));

  const [togglTimeEntries, togglTasks, timesheeterProjects] = await Promise.all([
    togglTimeEntriesPromise,
    togglTasksPromise,
    timesheeterProjectsPromise,
  ]);

  return {
    togglTimeEntries,
    togglProjects,
    togglTasks,
    timesheeterProjects,
    uncategorizedTasksProject: await getUncategorizedTasksProject({ togglProjects, context }),
  };
};

const getUncategorizedTasksProject = async ({
  togglProjects,
  context,
}: {
  togglProjects: RawTogglProject[];
  context: TogglIntegrationContext;
}): Promise<RawTogglProject> => {
  const unassignedTasksProject = togglProjects.find((project) => project.name === UNCATEGORIZED_TASKS_PROJECT_NAME);

  if (unassignedTasksProject) {
    return unassignedTasksProject;
  }

  const uncategorizedTasksProject = await toggl.projects.post({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId },
    body: {
      name: UNCATEGORIZED_TASKS_PROJECT_NAME,
      active: true,
      is_private: false,
    },
  });

  await context.prisma.togglSyncRecord.create({
    data: {
      workspaceId: context.workspaceId,
      category: togglProjectSyncRecordType,
      togglEntityId: uncategorizedTasksProject.id,
      togglProjectId: uncategorizedTasksProject.id,
    },
    select: togglSyncRecordSelectQuery,
  });

  return {
    ...uncategorizedTasksProject,
  };
};
