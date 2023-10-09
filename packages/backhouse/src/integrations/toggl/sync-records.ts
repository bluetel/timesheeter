import { type TogglIntegrationContext } from './lib';
import { type PreSyncData } from './pre-sync/data';

export const togglProjectSyncRecordType = 'Project';
export const togglTaskSyncRecordType = 'Task';
export const togglTimeEntrySyncRecordType = 'TimeEntry';

export const togglSyncRecordSelectQuery = {
  category: true,
  workspaceId: true,
  togglEntityId: true,
  togglProjectId: true,
} as const;

export type TogglProjectSyncRecord = {
  category: typeof togglProjectSyncRecordType;
  workspaceId: string;
  togglEntityId: bigint;
  togglProjectId: bigint;
};

export type TogglTaskSyncRecord = {
  category: typeof togglTaskSyncRecordType;
  workspaceId: string;
  togglEntityId: bigint;
  togglProjectId: bigint;
};

export type TogglTimeEntrySyncRecord = {
  category: typeof togglTimeEntrySyncRecordType;
  workspaceId: string;
  togglEntityId: bigint;
  togglProjectId: bigint;
};

/** Creates TogglSyncRecords in Timesheeter declaring that a record exists */
export const createTogglSyncRecords = async ({
  preSyncData,
  context,
}: {
  preSyncData: PreSyncData;
  context: TogglIntegrationContext;
}) => {
  const { togglProjects, uncategorizedTasksProject } = preSyncData;

  const duplicateAllProjects = [...togglProjects, uncategorizedTasksProject];

  // Ensure no duplicate ids
  const allProjects = duplicateAllProjects.filter(
    (project, index) => duplicateAllProjects.findIndex((project2) => project2.id === project.id) === index
  );

  // Create sync records for all projects if they don't exist
  const createProjectPromises = Promise.all(
    allProjects.map((project) =>
      context.prisma.togglSyncRecord.upsert({
        where: {
          workspaceId_category_togglEntityId_togglProjectId: {
            workspaceId: context.workspaceId,
            category: togglProjectSyncRecordType,
            togglEntityId: project.id,
            togglProjectId: project.id,
          },
        },
        update: {},
        create: {
          workspaceId: context.workspaceId,
          category: togglProjectSyncRecordType,
          togglEntityId: project.id,
          togglProjectId: project.id,
        },
      })
    )
  );

  const createTaskPromises = Promise.all(
    preSyncData.togglTasks.map((task) =>
      context.prisma.togglSyncRecord.upsert({
        where: {
          workspaceId_category_togglEntityId_togglProjectId: {
            workspaceId: context.workspaceId,
            category: togglTaskSyncRecordType,
            togglEntityId: task.id,
            togglProjectId: task.project_id,
          },
        },
        update: {},
        create: {
          workspaceId: context.workspaceId,
          category: togglTaskSyncRecordType,
          togglEntityId: task.id,
          togglProjectId: task.project_id,
        },
      })
    )
  );

  const createTimeEntryPromises = Promise.all(
    preSyncData.togglTimeEntries.map((timeEntry) => {
      if (!timeEntry.project_id) {
        return Promise.resolve();
      }

      return context.prisma.togglSyncRecord.upsert({
        where: {
          workspaceId_category_togglEntityId_togglProjectId: {
            workspaceId: context.workspaceId,
            category: togglTimeEntrySyncRecordType,
            togglEntityId: timeEntry.id,
            togglProjectId: timeEntry.project_id,
          },
        },
        update: {},
        create: {
          workspaceId: context.workspaceId,
          category: togglTimeEntrySyncRecordType,
          togglEntityId: timeEntry.id,
          togglProjectId: timeEntry.project_id,
        },
      });
    })
  );

  await Promise.all([createProjectPromises, createTaskPromises, createTimeEntryPromises]);
};
