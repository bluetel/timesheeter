import {
  deleteTimesheetEntry,
  encrypt,
  getDefaultTimesheetEntryConfig,
  matchTaskRegex,
  parseTimesheetEntry,
} from '@timesheeter/web';
import { toggl } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import {
  TimesheetEntryPair,
  TimesheeterTimesheetEntry,
  TogglTimeEntry,
  timesheeterTimesheetEntrySelectQuery,
} from './data';
import { togglTimeEntrySyncRecordType } from '../../pre-sync/sync-records';

export const updateTimesheeterTimesheetEntry = async ({
  context: { prisma },
  togglTimeEntry,
  timesheeterTimesheetEntry,
  updatedTimesheeterTaskId,
  updatedTimesheeterUserId,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
    stop: string;
  };
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
  updatedTimesheeterTaskId: string;
  updatedTimesheeterUserId: string;
}): Promise<TimesheetEntryPair> => {
  // Filter out task numbers from the description
  const { description } = togglTimeEntry.description
    ? matchTaskRegex(togglTimeEntry.description)
    : {
        description: null,
      };

  const updatedTimesheeterTimesheetEntry = await prisma.timesheetEntry
    .update({
      where: {
        id: timesheeterTimesheetEntry.id,
      },
      data: {
        start: new Date(togglTimeEntry.start),
        end: new Date(togglTimeEntry.stop),
        description,
        taskId: updatedTimesheeterTaskId,
        togglTimeEntryId: togglTimeEntry.id,
        userId: updatedTimesheeterUserId,
      },
      select: timesheeterTimesheetEntrySelectQuery,
    })
    .then((timesheetEntry) => parseTimesheetEntry(timesheetEntry, false));

  return {
    togglTimeEntry,
    timesheeterTimesheetEntry: updatedTimesheeterTimesheetEntry,
  };
};

export const updateTogglTimeEntry = async ({
  context: { axiosClient, togglWorkspaceId, prisma },
  togglTimeEntry,
  timesheeterTimesheetEntry,
  updatedTogglTaskId,
  updatedTogglUserId,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
  };
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
  updatedTogglTaskId: number;
  updatedTogglUserId: number;
}): Promise<TimesheetEntryPair> => {
  if (!timesheeterTimesheetEntry.task.project.togglProjectId) {
    throw new Error(
      `Timesheeter task does not have a toggl project id, this should have been set in the sync projects step, task id: ${timesheeterTimesheetEntry.task.id}`
    );
  }

  const updatedTogglTimeEntry = await toggl.timeEntries.put({
    axiosClient,
    path: { workspace_id: togglWorkspaceId, time_entry_id: togglTimeEntry.id },
    body: {
      task_id: updatedTogglTaskId,
      billable: false,
      description: timesheeterTimesheetEntry.description ?? '',
      start: timesheeterTimesheetEntry.start.toISOString(),
      stop: timesheeterTimesheetEntry.end.toISOString(),
      workspace_id: togglWorkspaceId,
      created_with: 'timesheeter',
      tag_action: 'add',
      user_id: updatedTogglUserId,
      project_id: Number(timesheeterTimesheetEntry.task.project.togglProjectId),
    },
  });

  if (!updatedTogglTimeEntry.stop) {
    throw new Error('Toggl time entry stop is null, we just created it, it should not be null');
  }

  const updatedTimesheeterTimesheetEntry = await prisma.timesheetEntry
    .update({
      where: {
        id: timesheeterTimesheetEntry.id,
      },
      data: {
        togglTimeEntryId: updatedTogglTimeEntry.id,
      },
      select: timesheeterTimesheetEntrySelectQuery,
    })
    .then((timesheetEntry) => parseTimesheetEntry(timesheetEntry, false));

  return {
    togglTimeEntry: {
      ...updatedTogglTimeEntry,
      stop: updatedTogglTimeEntry.stop,
      deleted: false as const,
    },
    timesheeterTimesheetEntry: updatedTimesheeterTimesheetEntry,
  };
};

export const createTimesheeterTimesheetEntry = async ({
  context: { prisma, workspaceId },
  togglTimeEntry,
  timesheeterTaskId,
  timesheeterUserId,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
    stop: string;
  };
  timesheeterTaskId: string;
  timesheeterUserId: string;
}): Promise<TimesheetEntryPair> => {
  // Filter out task numbers from the description
  const { description } = togglTimeEntry.description
    ? matchTaskRegex(togglTimeEntry.description)
    : {
        description: null,
      };

  const timesheeterTimesheetEntry = await prisma.timesheetEntry
    .create({
      data: {
        start: new Date(togglTimeEntry.start),
        end: new Date(togglTimeEntry.stop),
        configSerialized: encrypt(JSON.stringify(getDefaultTimesheetEntryConfig())),
        description,
        workspaceId,
        taskId: timesheeterTaskId,
        togglTimeEntryId: togglTimeEntry.id,
        userId: timesheeterUserId,
      },
      select: timesheeterTimesheetEntrySelectQuery,
    })

    .then((timesheetEntry) => parseTimesheetEntry(timesheetEntry, false));

  return {
    togglTimeEntry,
    timesheeterTimesheetEntry,
  };
};

export const createTogglTimeEntry = async ({
  context: { axiosClient, prisma, togglWorkspaceId, workspaceId },
  timesheeterTimesheetEntry,
  togglTaskId,
  togglUserId,
}: {
  context: TogglIntegrationContext;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
  togglTaskId: number;
  togglUserId: number;
}): Promise<TimesheetEntryPair> => {
  if (!timesheeterTimesheetEntry.task.project.togglProjectId) {
    throw new Error(
      `Timesheeter task does not have a toggl project id, this should have been set in the sync projects step, task id: ${timesheeterTimesheetEntry.task.id}`
    );
  }

  const togglTimeEntry = await toggl.timeEntries.post({
    axiosClient,
    path: { workspace_id: togglWorkspaceId },
    body: {
      task_id: togglTaskId,
      billable: false,
      description: timesheeterTimesheetEntry.description ?? '',
      start: timesheeterTimesheetEntry.start.toISOString(),
      stop: timesheeterTimesheetEntry.end.toISOString(),
      workspace_id: togglWorkspaceId,
      created_with: 'timesheeter',
      tag_action: 'add',
      user_id: togglUserId,
      project_id: Number(timesheeterTimesheetEntry.task.project.togglProjectId),
    },
  });

  // Create a new sync record as we have a new toggl entity
  await prisma.togglSyncRecord.create({
    data: {
      workspaceId,
      togglEntityId: togglTimeEntry.id,
      category: togglTimeEntrySyncRecordType,
      togglProjectId: Number(timesheeterTimesheetEntry.task.project.togglProjectId),
    },
  });

  const updatedTimsheeterTimesheetEnty = await prisma.timesheetEntry
    .update({
      where: {
        id: timesheeterTimesheetEntry.id,
      },
      data: {
        togglTimeEntryId: togglTimeEntry.id,
      },
      select: timesheeterTimesheetEntrySelectQuery,
    })
    .then((timesheetEntry) => parseTimesheetEntry(timesheetEntry, false));

  if (!togglTimeEntry.stop) {
    throw new Error('Toggl time entry stop is null, we just created it, it should not be null');
  }

  return {
    togglTimeEntry: {
      ...togglTimeEntry,
      stop: togglTimeEntry.stop,
      deleted: false as const,
    },
    timesheeterTimesheetEntry: updatedTimsheeterTimesheetEnty,
  };
};

export const deleteTimesheeterTimesheetEntry = async ({
  context: { prisma, workspaceId, axiosClient, togglWorkspaceId },
  togglTimeEntry,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: true;
  };
}): Promise<TimesheetEntryPair> => {
  const timesheeterTimesheetEntry = await prisma.timesheetEntry.findFirst({
    where: {
      workspaceId,
      togglTimeEntryId: togglTimeEntry.togglEntityId,
    },
    select: {
      id: true,
    },
  });

  if (timesheeterTimesheetEntry) {
    await deleteTimesheetEntry({
      prisma,
      timesheetEntryId: timesheeterTimesheetEntry.id,
    });
  }

  // Delete the time entry from toggl, before it was just marked as to delete
  await toggl.timeEntries.delete({
    axiosClient: axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
      time_entry_id: Number(togglTimeEntry.togglEntityId),
    },
  });

  return {
    togglTimeEntry,
    timesheeterTimesheetEntry: null,
  };
};

export const deleteTogglTimeEntry = async ({
  context: { axiosClient, togglWorkspaceId },
  togglTimeEntry,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
  };
}): Promise<TimesheetEntryPair> => {
  await toggl.timeEntries.delete({
    axiosClient,
    path: { workspace_id: togglWorkspaceId, time_entry_id: togglTimeEntry.id },
  });

  return {
    togglTimeEntry,
    timesheeterTimesheetEntry: null,
  };
};
