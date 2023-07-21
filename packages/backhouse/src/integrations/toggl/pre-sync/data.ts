import { parseProject } from '@timesheeter/web';
import { toggl } from '../api';
import { TogglIntegrationContext } from '../lib';

export const getPreSyncData = async ({
  context,
  startDate,
  endDate,
}: {
  context: TogglIntegrationContext;
  startDate: Date;
  endDate: Date;
}) => {
  const togglTimeEntriesPromise = toggl.timeEntries
    .get({
      axiosClient: context.axiosClient,
      path: { start_date: startDate, end_date: endDate },
    })
    .then((timeEntries) => timeEntries.filter((timeEntry) => timeEntry.workspace_id === context.togglWorkspaceId));

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
      select: {
        id: true,
        configSerialized: true,
        taskPrefixes: {
          select: {
            prefix: true,
          },
        },
      },
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
