import { parseProject } from '@timesheeter/web';
import { toggl } from '../api';
import { type TogglIntegrationContext } from '../lib';
import { timesheeterProjectSelectQuery } from '../sync';

export type PreSyncData = Awaited<ReturnType<typeof getPreSyncData>>;

export const getPreSyncData = async ({ context }: { context: TogglIntegrationContext }) => {
  const togglTimeEntriesPromise = toggl.reports.search
    .timeEntries({
      axiosClient: context.axiosClient,
      path: { workspace_id: context.togglWorkspaceId },
      query: {
        start_date: context.startDate.toISOString(),
        end_date: context.endDate.toISOString(),
      },
    })
    .then((timeEntries) => {
      const filteredEntries = timeEntries.filter(
        (timeEntry) => timeEntry.workspace_id === context.togglWorkspaceId && timeEntry.stop
      );

      // Sort filtered entries so that those with taskId and projectId are first
      // then those with projectId and no taskId second then those with no projectId and no taskId last
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
    // sort so at earliest is first
  ).then((results) => results.flat().sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)));

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
  };
};
