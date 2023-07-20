import { getAxiosClient, toggl } from './api';

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
  const projectsPromise = toggl.projects.get({ axiosClient, path: { workspace_id: workspaceId } });

  const tagsPromise = toggl.tags.get({ axiosClient, path: { workspace_id: workspaceId } });

  const timeEntriesPromise = toggl.timeEntries
    .get({ axiosClient, path: { start_date: startDate, end_date: endDate } })
    .then((timeEntries) => timeEntries.filter((timeEntry) => timeEntry.workspace_id === workspaceId));

  const [projects, tags, timeEntries] = await Promise.all([projectsPromise, tagsPromise, timeEntriesPromise]);

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
