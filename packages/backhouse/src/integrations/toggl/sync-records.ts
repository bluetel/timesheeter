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
  // Create sync records for all new toggl entities if they don't exist already
  const createProjectPromises = Promise.all(
    preSyncData.togglProjects.map((project) =>
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

  await Promise.all([createProjectPromises, createTaskPromises]);
};
