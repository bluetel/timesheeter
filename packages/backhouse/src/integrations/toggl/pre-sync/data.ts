import {
  ParsedProject,
  UNCATEGORIZED_TASKS_PROJECT_NAME,
  getDefaultProjectConfig,
  parseProject,
} from '@timesheeter/web';
import { TogglProject, toggl } from '../api';
import { TogglIntegrationContext } from '../lib';
import { TimesheeterProject, timesheeterProjectSelectQuery } from '../sync';

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
  togglProjects: TogglProject[];
  context: TogglIntegrationContext;
}): Promise<TogglProject> => {
  const unassignedTasksProject = togglProjects.find((project) => project.name === UNCATEGORIZED_TASKS_PROJECT_NAME);

  if (unassignedTasksProject) {
    return unassignedTasksProject;
  }

  return toggl.projects.post({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId },
    body: {
      name: UNCATEGORIZED_TASKS_PROJECT_NAME,
      active: true,
      is_private: false,
    },
  });
};
