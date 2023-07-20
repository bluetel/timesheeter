import { getAxiosClient, toggl } from './api';

export const getAndVerifyTogglWorkspaceId = async ({
  axiosClient,
  togglWorkspaceId,
}: {
  axiosClient: ReturnType<typeof getAxiosClient>;
  togglWorkspaceId: number | null;
}) => {
  const me = await toggl.me.get({ axiosClient });

  if (togglWorkspaceId === null) {
    return me.default_workspace_id;
  }

  const workspace = me.workspaces.find((w) => w.id === togglWorkspaceId);

  if (!workspace) {
    throw new Error(`Could not find workspace with id ${togglWorkspaceId}`);
  }

  return workspace.id;
};

export const getAllTogglData = async ({
  axiosClient,
  workspaceId,
  startDate,
  endDate,
}: {
  axiosClient: ReturnType<typeof getAxiosClient>;
  workspaceId: number;
  startDate: Date;
  endDate: Date;
}) => {
  const [projects, tags, timeEntries] = await Promise.all([
    toggl.projects.get({ axiosClient, path: { workspace_id: workspaceId } }),

    toggl.tags.get({ axiosClient, path: { workspace_id: workspaceId } }),

    toggl.timeEntries
      .get({ axiosClient, path: { start_date: startDate, end_date: endDate } })
      .then((timeEntries) => timeEntries.filter((timeEntry) => timeEntry.workspace_id === workspaceId)),
  ]);

  // Get tasks for each project
  const tasks = await Promise.all(
    projects.map(async (project) =>
      toggl.tasks.get({ axiosClient, path: { workspace_id: workspaceId, project_id: project.id } })
    )
  ).then((tasks) => tasks.flat());

  return {
    projects,
    tags,
    timeEntries,
    tasks,
  };
};
