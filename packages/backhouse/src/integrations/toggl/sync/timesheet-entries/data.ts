import { parseTimesheetEntry } from '@timesheeter/web';
import { toggl, TogglTimeEntry } from '../../api';
import { TogglIntegrationContext } from '../../lib';

//   will need to still remove task prefix and description from any time entries that are synced into toggl

// this will alos have to be incorporated into the difference check as the description fields will be different

export type FilteredTogglTimeEntry = Omit<TogglTimeEntry, 'stop'> & {
  stop: string;
};

export type TimesheetEntryPair = {
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

export const timesheeterTimesheetEntrySelectQuery = {
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

export const createTimesheetEntryPairs = async ({
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

export type TimesheeterTimesheetEntry = Awaited<
  ReturnType<typeof getTimesheetEntryData>
>['timesheeterTimesheetEntries'][0];
