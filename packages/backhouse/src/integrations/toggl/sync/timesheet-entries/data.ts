import { parseTimesheetEntry } from '@timesheeter/web';
import { type RawTogglTimeEntry, toggl } from '../../api';
import { type TogglIntegrationContext } from '../../lib';
import {
  type TogglTimeEntrySyncRecord,
  togglSyncRecordSelectQuery,
  togglTimeEntrySyncRecordType,
} from '../../sync-records';

export type TogglTimeEntry =
  | (RawTogglTimeEntry & {
      deleted: false;
      stop: string;
    })
  | ({
      deleted: true;
    } & TogglTimeEntrySyncRecord);

const getTimesheetEntryData = async ({
  context: { prisma, workspaceId, togglWorkspaceId, axiosClient, startDate, endDate },
}: {
  context: TogglIntegrationContext;
}) => {
  const togglTimeEntriesPromise = toggl.reports.search
    .timeEntries({
      axiosClient,
      path: { workspace_id: togglWorkspaceId },
      query: { start_date: startDate.toISOString(), end_date: endDate.toISOString() },
    })
    .then((timeEntries) =>
      timeEntries.filter((timeEntry) => timeEntry.workspace_id === togglWorkspaceId && timeEntry.stop)
    ) as Promise<
    (TogglTimeEntry & {
      deleted: false;
      stop: string;
    })[]
  >;

  const togglTimeEntrySyncRecordsPromise = prisma.togglSyncRecord.findMany({
    where: {
      workspaceId,
      category: togglTimeEntrySyncRecordType,
    },
    select: togglSyncRecordSelectQuery,
  }) as Promise<TogglTimeEntrySyncRecord[]>;

  const timesheeterTimesheetEntriesPromise = prisma.timesheetEntry
    .findMany({
      where: {
        workspaceId,
        start: {
          gte: startDate,
        },
      },
      select: timesheeterTimesheetEntrySelectQuery,
    })
    .then((timesheetEntries) => timesheetEntries.map((timesheetEntry) => parseTimesheetEntry(timesheetEntry, false)));

  const [togglTimeEntries, togglTimeEntrySyncRecords, timesheeterTimesheetEntries] = await Promise.all([
    togglTimeEntriesPromise,
    togglTimeEntrySyncRecordsPromise,
    timesheeterTimesheetEntriesPromise,
  ]);

  // sort timesheeter timesheet entries by start date, earliest first
  timesheeterTimesheetEntries.sort((a, b) => a.start.getTime() - b.start.getTime());

  // sort toggl time entries by start date, earliest first
  togglTimeEntries.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return {
    togglTimeEntries,
    togglTimeEntrySyncRecords,
    timesheeterTimesheetEntries,
  };
};

export type TimesheeterTimesheetEntry = Awaited<
  ReturnType<typeof getTimesheetEntryData>
>['timesheeterTimesheetEntries'][0];

export type TimesheetEntryPair = {
  togglTimeEntry: TogglTimeEntry | null;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry | null;
};

/** Once we have synced projects each pair always has a toggl project, though it
 * may be marked as deleted
 */
export type EvaluatedTimesheetEntryPair = {
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
  };
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry | null;
};

export const timesheeterTimesheetEntrySelectQuery = {
  id: true,
  updatedAt: true,
  start: true,
  deleted: true,
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
      project: {
        select: {
          togglProjectId: true,
        },
      },
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

export const createTimesheetEntryPairs = async ({
  context,
}: {
  context: TogglIntegrationContext;
}): Promise<TimesheetEntryPair[]> => {
  const { togglTimeEntries, timesheeterTimesheetEntries, togglTimeEntrySyncRecords } = await getTimesheetEntryData({
    context,
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

  // Add togglTimeEntrySyncRecords that are not in togglTimeEntries
  const togglTimeEntrySyncRecordsWithoutTogglTimeEntry = togglTimeEntrySyncRecords.filter(
    (togglTimeEntrySyncRecord) =>
      !togglTimeEntries.find((togglTimeEntry) => togglTimeEntry.id === Number(togglTimeEntrySyncRecord.togglEntityId))
  );

  togglTimeEntrySyncRecordsWithoutTogglTimeEntry.forEach((togglTimeEntrySyncRecord) => {
    const timesheeterTimesheetEntry = timesheeterTimesheetEntries.find(
      (timesheeterTimesheetEntry) =>
        timesheeterTimesheetEntry.togglTimeEntryId === togglTimeEntrySyncRecord.togglEntityId
    );

    if (timesheeterTimesheetEntry) {
      timesheetEntryPairs.push({
        togglTimeEntry: {
          ...togglTimeEntrySyncRecord,
          deleted: true,
        },
        timesheeterTimesheetEntry,
      });
    }
  });

  return timesheetEntryPairs;
};
