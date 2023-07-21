import { encrypt, getDefaultTaskConfig, parseTimesheetEntry } from '@timesheeter/web';
import { toggl, TogglTimeEntry } from '../api';
import { TogglIntegrationContext } from '../lib';
import { EvaluatedProjectPair } from './projects';
import { EvaluatedTaskPair } from './tasks';

type FilteredTogglTimeEntry = Omit<TogglTimeEntry, 'stop'> & {
  stop: string;
};

type TimesheetEntryPair = {
  togglTimeEntry: FilteredTogglTimeEntry | null;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry | null;
};

/** Once we have synced projects each pair always has a toggl project, though it
 * may be marked as deleted
 */
export type EvaluatedTimesheetEntryPair = {
  togglTimeEntry: FilteredTogglTimeEntry;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry | null;
};

export const syncTimesheetEntries = async ({
  context,
  startDate,
  endDate,
  syncedProjectPairs,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  startDate: Date;
  endDate: Date;
  syncedProjectPairs: EvaluatedProjectPair[];
  syncedTaskPairs: EvaluatedTaskPair[];
}): Promise<EvaluatedTimesheetEntryPair[]> => {
  const timesheetEntryPairs = await createTimesheetEntryPairs({ context, startDate, endDate });

  // As we update the timesheeter projects in the loop, we need to store the updated projects
  const updatedTimesheetEntryPairs = [] as TimesheetEntryPair[];

  // Loop through all project pairs and create/update/delete projects as needed
  for (const timesheetEntryPair of timesheetEntryPairs) {
    const { togglTimeEntry, timesheeterTimesheetEntry } = timesheetEntryPair;

    // If both projects exist, update the timesheeter project with the toggl project data
    if (togglTimeEntry && !togglTimeEntry.deleted && timesheeterTimesheetEntry) {
      // If both unchanged, skip
      if (
        togglTimeEntry.start === timesheeterTimesheetEntry.start.toISOString() &&
        togglTimeEntry.stop === timesheeterTimesheetEntry.end.toISOString() &&
        togglTimeEntry.description === timesheeterTimesheetEntry.description &&
        BigInt(togglTimeEntry.id) === timesheeterTimesheetEntry.togglTimeEntryId &&
        context.togglIdToEmail[togglTimeEntry.user_id] ===
          context.timesheeterUserIdToEmail[timesheeterTimesheetEntry.userId] &&
        togglTimeEntry.task_id === timesheeterTimesheetEntry.task.togglTaskId
      ) {
        updatedTimesheetEntryPairs.push(timesheetEntryPair);
        continue;
      }

      // Check to see which project has been updated more recently, then copy the data from the newer project to the older one

      if (togglTimeEntry.at > timesheeterTimesheetEntry.updatedAt) {
        // Update the timesheeter project with the toggl project data

        const targetUserEmail = context.togglIdToEmail[togglTimeEntry.user_id];

        if (!targetUserEmail) {
          throw new Error(
            `Toggl user id does not have an email in the context, this should not happen, user id: ${togglTimeEntry.user_id}`
          );
        }

        const timesheeterUserId = Object.entries(context.timesheeterUserIdToEmail).find(
          ([_, email]) => email === targetUserEmail
        )?.[0];

        if (!timesheeterUserId) {
          console.warn(
            `The user with email ${targetUserEmail} is not in the timesheeter workspace, please add them to the workspace`
          );
          // Nothing we can do here as we cannot assign in timesheeter without a user id
          updatedTimesheetEntryPairs.push(timesheetEntryPair);
          continue;
        }

        const timesheeterTaskId = syncedTaskPairs.find(
          (syncedTaskPair) => syncedTaskPair.togglTask.id === togglTimeEntry.task_id
        )?.timesheeterTask?.id;

        if (!timesheeterTaskId) {
          throw new Error(
            `Toggl task id does not have a timesheeter task id, this should have been set in the sync tasks step, task id: ${togglTimeEntry.task_id}`
          );
        }

        updatedTimesheetEntryPairs.push(
          await updateTimesheeterTimesheetEntry({
            context,
            timesheeterTimesheetEntry,
            togglTimeEntry,
            updatedTimesheeterTaskId: timesheeterTaskId,
            updatedTimesheeterUserId: timesheeterUserId,
          })
        );
        continue;
      }

      const targetUserEmail = context.timesheeterUserIdToEmail[timesheeterTimesheetEntry.userId];

      if (!targetUserEmail) {
        throw new Error(
          `Timesheeter user id does not have an email in the context, this should not happen, user id: ${timesheeterTimesheetEntry.userId}`
        );
      }

      const togglUserId = Object.entries(context.togglIdToEmail).find(([_, email]) => email === targetUserEmail)?.[0];

      if (!togglUserId) {
        console.warn(
          `The user with email ${targetUserEmail} is not in the toggl workspace, please add them to the workspace`
        );
        // Nothing we can do here as we cannot assign in toggl without a user id
        updatedTimesheetEntryPairs.push(timesheetEntryPair);
        continue;
      }

      if (!timesheeterTimesheetEntry.task.togglTaskId) {
        throw new Error(
          `Timesheeter task does not have a toggl task id, this should have been set in the sync tasks step, task id: ${timesheeterTimesheetEntry.task.id}`
        );
      }

      // Update the toggl time entry with the timesheeter timesheet entry data
      updatedTimesheetEntryPairs.push(
        await updateTogglTimeEntry({
          context,
          timesheeterTimesheetEntry,
          togglTimeEntry,
          updatedTogglTaskId: Number(timesheeterTimesheetEntry.task.togglTaskId),
          updatedTogglUserId: Number(togglUserId),
        })
      );
      continue;
    }

    // If only the toggl time entry exists and not deleted, create a new timesheeter timesheet entry
    if (togglTimeEntry && !togglTimeEntry.deleted && !timesheeterTimesheetEntry) {
      const targetUserEmail = context.togglIdToEmail[togglTimeEntry.user_id];

      if (!targetUserEmail) {
        throw new Error(
          `Toggl user id does not have an email in the context, this should not happen, user id: ${togglTimeEntry.user_id}`
        );
      }

      const timesheeterUserId = Object.entries(context.timesheeterUserIdToEmail).find(
        ([_, email]) => email === targetUserEmail
      )?.[0];

      if (!timesheeterUserId) {
        console.warn(
          `The user with email ${targetUserEmail} is not in the timesheeter workspace, please add them to the workspace`
        );
        // Nothing we can do here as we cannot assign in toggl without a user id
        updatedTimesheetEntryPairs.push(timesheetEntryPair);
        continue;
      }

      if (!togglTimeEntry.task_id) {
        console.warn(
          `The toggl time entry with id ${togglTimeEntry.id} does not have a task id, this may occasionaly happen if an entry was created after pre-sync but before sync`
        );
        updatedTimesheetEntryPairs.push(timesheetEntryPair);
        continue;
      }

      const timesheeterTaskId = syncedTaskPairs.find(
        (syncedTaskPair) => syncedTaskPair.togglTask.id === togglTimeEntry.task_id
      )?.timesheeterTask?.id;

      if (!timesheeterTaskId) {
        throw new Error(
          `Toggl task id does not have a timesheeter task id, this should have been set in the sync tasks step, task id: ${togglTimeEntry.task_id}`
        );
      }

      updatedTimesheetEntryPairs.push(
        await createTimesheeterTimesheetEntry({ context, togglTimeEntry, timesheeterUserId, timesheeterTaskId })
      );
      continue;
    }

    // If only the timesheeter timesheet entry exists, create a new toggl time entry
    if (!togglTimeEntry && timesheeterTimesheetEntry) {
      const targetUserEmail = context.timesheeterUserIdToEmail[timesheeterTimesheetEntry.userId];

      if (!targetUserEmail) {
        throw new Error(
          `Timesheeter user id does not have an email in the context, this should not happen, user id: ${timesheeterTimesheetEntry.userId}`
        );
      }

      const togglUserId = Object.entries(context.togglIdToEmail).find(([_, email]) => email === targetUserEmail)?.[0];

      if (!togglUserId) {
        console.warn(
          `The user with email ${targetUserEmail} is not in the toggl workspace, please add them to the workspace`
        );
        // Nothing we can do here as we cannot assign in toggl without a user id
        updatedTimesheetEntryPairs.push(timesheetEntryPair);
        continue;
      }

      if (!timesheeterTimesheetEntry.task.togglTaskId) {
        throw new Error(
          `Timesheeter task does not have a toggl task id, this should have been set in the sync tasks step, task id: ${timesheeterTimesheetEntry.task.id}`
        );
      }

      updatedTimesheetEntryPairs.push(
        await createTogglTimeEntry({
          context,
          timesheeterTimesheetEntry,
          togglUserId: Number(togglUserId),
          togglTaskId: Number(timesheeterTimesheetEntry.task.togglTaskId),
        })
      );
      continue;
    }

    // If only the toggl project exists and is deleted, delete the timesheeter project
    if (togglTimeEntry && togglTimeEntry.deleted && timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(await deleteTimesheeterTimesheetEntry({ context, togglTimeEntry }));
      continue;
    }

    console.warn('Unreachable code reached in syncTimesheetEntries');
    updatedTimesheetEntryPairs.push(timesheetEntryPair);
  }

  // Ensure that all pairs have a toggl time entry
  return updatedTimesheetEntryPairs
    .map((timesheetEntryPair) => {
      if (timesheetEntryPair.togglTimeEntry) {
        return timesheetEntryPair as EvaluatedTimesheetEntryPair;
      }

      return null;
    })
    .filter((timesheetEntryPair): timesheetEntryPair is EvaluatedTimesheetEntryPair => !!timesheetEntryPair);
};

const createTimesheetEntryPairs = async ({
  context,
  startDate,
  endDate,
}: {
  context: TogglIntegrationContext;
  startDate: Date;
  endDate: Date;
}): Promise<TimesheetEntryPair[]> => {
  const { togglTimeEntries, timesheeterTimesheetEntries } = await getTimesheetEntryData({
    context,
    startDate,
    endDate,
  });

  const timesheetEntryPairs: TimesheetEntryPair[] = [];

  // One toggl time entry can only be linked to one timesheeter timesheet entry, pairs may not exist,
  // in such case a pair with null values is created
  for (const togglTimeEntry of togglTimeEntries) {
    const timesheeterTimesheetEntry = timesheeterTimesheetEntries.find((timesheeterTimesheetEntry) => {
      return timesheeterTimesheetEntry?.togglTimeEntryId?.toString() === togglTimeEntry.id.toString();
    });

    timesheetEntryPairs.push({
      togglTimeEntry,
      timesheeterTimesheetEntry: timesheeterTimesheetEntry ?? null,
    });
  }

  const timesheeterTimesheetEntriesWithoutTogglProject = timesheeterTimesheetEntries.filter(
    (timesheeterTimesheetEntry) => {
      return !timesheeterTimesheetEntry.togglTimeEntryId;
    }
  );

  timesheeterTimesheetEntriesWithoutTogglProject.forEach((timesheeterTimesheetEntry) => {
    timesheetEntryPairs.push({
      togglTimeEntry: null,
      timesheeterTimesheetEntry,
    });
  });

  return timesheetEntryPairs;
};

const timesheeterTimesheetEntrySelectQuery = {
  id: true,
  updatedAt: true,
  start: true,
  end: true,
  description: true,
  configSerialized: true,
  togglTimeEntryId: true,
  userId: true,
  task: {
    select: {
      id: true,
      name: true,
      projectId: true,
      togglTaskId: true,
      ticketForTask: {
        select: {
          id: true,
          number: true,
          taskPrefix: {
            select: {
              id: true,
              prefix: true,
            },
          },
        },
      },
    },
  },
};

const getTimesheetEntryData = async ({
  context: { prisma, workspaceId, togglWorkspaceId, axiosClient },
  startDate,
  endDate,
}: {
  context: TogglIntegrationContext;
  startDate: Date;
  endDate: Date;
}) => {
  const togglTimeEntriesPromise = toggl.timeEntries
    .get({ axiosClient, path: { start_date: startDate, end_date: endDate } })
    .then((timeEntries) =>
      timeEntries.filter((timeEntry) => timeEntry.workspace_id === togglWorkspaceId && timeEntry.stop)
    ) as Promise<FilteredTogglTimeEntry[]>;

  const timesheeterTimesheetEntriesPromise = prisma.timesheetEntry
    .findMany({
      where: {
        workspaceId,
      },
      select: timesheeterTimesheetEntrySelectQuery,
    })
    .then((timesheetEntries) => timesheetEntries.map((timesheetEntry) => parseTimesheetEntry(timesheetEntry, false)));

  const [togglTimeEntries, timesheeterTimesheetEntries] = await Promise.all([
    togglTimeEntriesPromise,
    timesheeterTimesheetEntriesPromise,
  ]);

  return {
    togglTimeEntries,
    timesheeterTimesheetEntries,
  };
};

type TimesheeterTimesheetEntry = Awaited<ReturnType<typeof getTimesheetEntryData>>['timesheeterTimesheetEntries'][0];

const updateTimesheeterTimesheetEntry = async ({
  context: { prisma },
  togglTimeEntry,
  timesheeterTimesheetEntry,
  updatedTimesheeterTaskId,
  updatedTimesheeterUserId,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: FilteredTogglTimeEntry;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
  updatedTimesheeterTaskId: string;
  updatedTimesheeterUserId: string;
}): Promise<TimesheetEntryPair> => {
  const updatedTimesheeterTimesheetEntry = await prisma.timesheetEntry
    .update({
      where: {
        id: timesheeterTimesheetEntry.id,
      },
      data: {
        start: new Date(togglTimeEntry.start),
        end: new Date(togglTimeEntry.stop),
        description: togglTimeEntry.description ?? undefined,
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

const updateTogglTimeEntry = async ({
  context: { axiosClient, togglWorkspaceId, prisma },
  togglTimeEntry,
  timesheeterTimesheetEntry,
  updatedTogglTaskId,
  updatedTogglUserId,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: FilteredTogglTimeEntry;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
  updatedTogglTaskId: number;
  updatedTogglUserId: number;
}): Promise<TimesheetEntryPair> => {
  const updatedTogglTimeEntry = await toggl.timeEntries.put({
    axiosClient,
    path: { workspace_id: togglWorkspaceId, time_entry_id: togglTimeEntry.id },
    body: {
      task_id: updatedTogglTaskId,
      billable: true,
      description: timesheeterTimesheetEntry.description ?? undefined,
      start: timesheeterTimesheetEntry.start.toISOString(),
      stop: timesheeterTimesheetEntry.end.toISOString(),
      workspace_id: togglWorkspaceId,
      created_with: 'timesheeter',
      tag_action: 'add',
      user_id: updatedTogglUserId,
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
    },
    timesheeterTimesheetEntry: updatedTimesheeterTimesheetEntry,
  };
};

const createTimesheeterTimesheetEntry = async ({
  context: { prisma, workspaceId },
  togglTimeEntry,
  timesheeterTaskId,
  timesheeterUserId,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: FilteredTogglTimeEntry;
  timesheeterTaskId: string;
  timesheeterUserId: string;
}): Promise<TimesheetEntryPair> => {
  const timesheeterTimesheetEntry = await prisma.timesheetEntry
    .create({
      data: {
        start: new Date(togglTimeEntry.start),
        end: new Date(togglTimeEntry.stop),
        configSerialized: encrypt(JSON.stringify(getDefaultTaskConfig())),
        description: togglTimeEntry.description ?? undefined,
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

const createTogglTimeEntry = async ({
  context: { axiosClient, prisma, togglWorkspaceId },
  timesheeterTimesheetEntry,
  togglTaskId,
  togglUserId,
}: {
  context: TogglIntegrationContext;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
  togglTaskId: number;
  togglUserId: number;
}): Promise<TimesheetEntryPair> => {
  const togglTimeEntry = await toggl.timeEntries.post({
    axiosClient,
    path: { workspace_id: togglWorkspaceId },
    body: {
      task_id: togglTaskId,
      billable: true,
      description: timesheeterTimesheetEntry.description ?? undefined,
      start: timesheeterTimesheetEntry.start.toISOString(),
      stop: timesheeterTimesheetEntry.end.toISOString(),
      workspace_id: togglWorkspaceId,
      created_with: 'timesheeter',
      tag_action: 'add',
      user_id: togglUserId,
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
    },
    timesheeterTimesheetEntry: updatedTimsheeterTimesheetEnty,
  };
};

const deleteTimesheeterTimesheetEntry = async ({
  context: { prisma, workspaceId },
  togglTimeEntry,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: FilteredTogglTimeEntry;
}): Promise<TimesheetEntryPair> => {
  await prisma.timesheetEntry.deleteMany({
    where: {
      workspaceId: workspaceId,
      togglTimeEntryId: togglTimeEntry.id,
    },
  });

  return {
    togglTimeEntry,
    timesheeterTimesheetEntry: null,
  };
};
