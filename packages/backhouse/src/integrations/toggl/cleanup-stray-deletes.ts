import { toggl } from './api';
import { TogglIntegrationContext } from './lib';

/**Resources markeed with 'delete' in toggl won't get deleted if they were never
 * created in Timesheeter, so we need to clean them up manually after syncing
 */
export const cleanupStrayDeletes = async ({
  context: { axiosClient, togglWorkspaceId },
  startDate,
  endDate,
}: {
  context: TogglIntegrationContext;
  startDate: Date;
  endDate: Date;
}) => {
  const timesheetEntriesToDelete = await toggl.timeEntries
    .get({
      axiosClient,
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })
    .then((entries) =>
      entries
        .filter((entry) => entry.workspace_id === togglWorkspaceId && entry.description?.startsWith('delete'))
        .map((entry) => entry.id)
    );

  await Promise.all(
    timesheetEntriesToDelete.map((id) =>
      toggl.timeEntries.delete({
        axiosClient,
        path: {
          workspace_id: togglWorkspaceId,
          time_entry_id: id,
        },
      })
    )
  );

  const allProjects = await toggl.projects.get({
    axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
    },
  });

  const projectsToDelete = allProjects
    .filter((project) => project.name?.startsWith('delete'))
    .map((project) => project.id);

  await Promise.all(
    projectsToDelete.map((id) =>
      toggl.projects.delete({
        axiosClient,
        path: {
          workspace_id: togglWorkspaceId,
          project_id: id,
        },
      })
    )
  );

  const remainingProjects = allProjects.filter((project) => !projectsToDelete.includes(project.id));

  const tasksToDelete = await Promise.all(
    remainingProjects.map((project) =>
      toggl.tasks.get({
        axiosClient,
        path: {
          workspace_id: togglWorkspaceId,
          project_id: project.id,
        },
      })
    )
  ).then((tasks) =>
    tasks
      .flat()
      .filter((task) => task.name?.startsWith('delete'))
      .map((task) => {
        return {
          id: task.id,
          projectId: task.project_id,
        };
      })
  );

  await Promise.all(
    tasksToDelete.map(({ id, projectId }) =>
      toggl.tasks.delete({
        axiosClient,
        path: {
          workspace_id: togglWorkspaceId,
          project_id: projectId,
          task_id: id,
        },
      })
    )
  );
};
