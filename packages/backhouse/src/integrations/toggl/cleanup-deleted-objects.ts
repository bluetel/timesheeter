import { type TogglIntegrationContext } from './lib';
import { type EvaluatedProjectPair, type EvaluatedTaskPair } from './sync';
import { togglProjectSyncRecordType, togglTaskSyncRecordType } from './sync-records';

/**
 * Cleans up objects marked as deleted in Timesheeter that are no longer present in Toggl.
 */
export const cleanupDeletedObjects = async ({
  context,
  syncedProjectPairs,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  syncedProjectPairs: EvaluatedProjectPair[];
  syncedTaskPairs: EvaluatedTaskPair[];
}) => {
  const togglProjects = syncedProjectPairs.map((pair) => pair.togglProject);
  const togglTasks = syncedTaskPairs.map((pair) => pair.togglTask);

  const togglSyncRecords = await context.prisma.togglSyncRecord.findMany({
    where: {
      workspaceId: context.workspaceId,
    },
    select: {
      id: true,
      category: true,
      togglEntityId: true,
      togglProjectId: true,
    },
  });

  const { deletedTimesheeterProjects, deletedTimesheeterTasks } =
    await findDeletedTimesheeterEntities({ context });

  // If a deleted timesheeter project is not present in toggl, then we can delete it and its sync record
  const projectsToDelete = deletedTimesheeterProjects.filter((deletedTimesheeterProject) => {
    // If the deleted timesheeter project has no toggl project id, then we can delete it
    if (!deletedTimesheeterProject.togglProjectId) {
      return true;
    }

    const togglProjectId = Number(deletedTimesheeterProject.togglProjectId);

    return !togglProjects.some((togglProject) => togglProject.id === togglProjectId);
  });

  // If a deleted timesheeter task is not present in toggl, then we can delete it and its sync record
  const tasksToDelete = deletedTimesheeterTasks.filter((deletedTimesheeterTask) => {
    // If the deleted timesheeter task has no toggl task id, then we can delete it
    if (!deletedTimesheeterTask.togglTaskId) {
      return true;
    }

    const togglTaskId = Number(deletedTimesheeterTask.togglTaskId);

    return !togglTasks.some((togglTask) => togglTask.id === togglTaskId);
  });


  const syncRecordsToDelete = togglSyncRecords.filter((syncRecord) => {
    if (syncRecord.category === togglProjectSyncRecordType) {
      return projectsToDelete.some((project) => project.togglProjectId === syncRecord.togglEntityId);
    } else if (syncRecord.category === togglTaskSyncRecordType) {
      return tasksToDelete.some((task) => task.togglTaskId === syncRecord.togglEntityId);
    }
    return false;
  });

  await Promise.all([
    context.prisma.project.deleteMany({
      where: {
        id: {
          in: projectsToDelete.map((project) => project.id),
        },
      },
    }),
    context.prisma.task.deleteMany({
      where: {
        id: {
          in: tasksToDelete.map((task) => task.id),
        },
      },
    }),
    context.prisma.togglSyncRecord.deleteMany({
      where: {
        id: {
          in: syncRecordsToDelete.map((syncRecord) => syncRecord.id),
        },
      },
    }),
  ]);
};

const findDeletedTimesheeterEntities = async ({ context }: { context: TogglIntegrationContext }) => {
  const deletedTimesheeterProjectsPromise = context.prisma.project.findMany({
    where: {
      workspaceId: context.workspaceId,
      deleted: true,
    },
    select: {
      id: true,
      togglProjectId: true,
    },
  });

  const deletedTimesheeterTasksPromise = context.prisma.task.findMany({
    where: {
      workspaceId: context.workspaceId,
      deleted: true,
    },
    select: {
      id: true,
      togglTaskId: true,
    },
  });

  const [deletedTimesheeterProjects, deletedTimesheeterTasks] = await Promise.all([
    deletedTimesheeterProjectsPromise,
    deletedTimesheeterTasksPromise,
  ]);

  return {
    deletedTimesheeterProjects,
    deletedTimesheeterTasks,
  };
};
