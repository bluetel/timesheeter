import {
  encrypt,
  getDefaultProjectConfig,
  getDefaultTaskConfig,
  parseProject,
  parseTimesheetEntry,
} from '@timesheeter/web';
import { toggl, TogglProject, TogglTimeEntry } from '../api';
import { TogglIntegrationContext } from '../lib';
import { EvaluatedProjectPair, TimesheeterProject } from './projects';
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
        BigInt(togglTimeEntry.id) === timesheeterTimesheetEntry.togglTimeEntryId
      ) {
        updatedTimesheetEntryPairs.push(timesheetEntryPair);
        continue;
      }

      // Check to see which project has been updated more recently, then copy the data from the newer project to the older one

      if (togglTimeEntry.at > timesheeterTimesheetEntry.updatedAt) {
        // Update the timesheeter project with the toggl project data

        updatedTimesheetEntryPairs.push(await updateTimesheeterProject({ context, timesheeterProject, togglProject }));
        continue;
      }

      // Update the toggl project with the timesheeter project data
      updatedTimesheetEntryPairs.push(await updateTogglProject({ context, timesheeterProject, togglProject }));
      continue;
    }

    // If only the toggl project exists and not deleted, create a new timesheeter project
    if (togglTimeEntry && !togglTimeEntry.deleted && !timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(await createTimesheeterProject({ context, togglProject }));
      continue;
    }

    // If only the timesheeter project exists, create a new toggl project
    if (!togglTimeEntry && timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(await createTogglProject({ context, timesheeterProject }));
      continue;
    }

    // If only the toggl project exists and is deleted, delete the timesheeter project
    if (togglTimeEntry && togglTimeEntry.deleted && timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(await deleteTimesheeterTimesheetEntry({ context, togglProject }));
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
  task: {
    select: {
      id: true,
      name: true,
      projectId: true,
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
    );

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
