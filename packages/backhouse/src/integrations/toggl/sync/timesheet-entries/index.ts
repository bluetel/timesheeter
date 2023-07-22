import { TogglIntegrationContext } from '../../lib';
import { EvaluatedTaskPair } from '../tasks';
import { EvaluatedTimesheetEntryPair, TimesheetEntryPair, createTimesheetEntryPairs } from './data';
import { deleteTimesheeterTimesheetEntry } from './mutations';
import { handleTwoWayUpdates, handleCreateTimesheeterEntry, handleCreateTogglEntry } from './pair-handlers';

export const syncTimesheetEntries = async ({
  context,
  startDate,
  endDate,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  startDate: Date;
  endDate: Date;
  syncedTaskPairs: EvaluatedTaskPair[];
}): Promise<EvaluatedTimesheetEntryPair[]> => {
  const timesheetEntryPairs = await createTimesheetEntryPairs({ context, startDate, endDate });

  // As we update the timesheeter timesheet entries in the loop, we need to store the updated imesheet entries
  const updatedTimesheetEntryPairs = [] as TimesheetEntryPair[];

  // Loop through all project pairs and create/update/delete imesheet entries as needed
  for (const timesheetEntryPair of timesheetEntryPairs) {
    const { togglTimeEntry, timesheeterTimesheetEntry } = timesheetEntryPair;

    // If both imesheet entries exist, determine which one is newer and update the older one with the newer one
    if (togglTimeEntry && !togglTimeEntry.deleted && timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(
        await handleTwoWayUpdates({ context, togglTimeEntry, timesheeterTimesheetEntry, syncedTaskPairs })
      );
      continue;
    }

    // If only the toggl time entry exists and not deleted, create a new timesheeter timesheet entry
    if (togglTimeEntry && !togglTimeEntry.deleted && !timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(await handleCreateTimesheeterEntry({ context, togglTimeEntry, syncedTaskPairs }));
      continue;
    }

    // If only the timesheeter timesheet entry exists, create a new toggl time entry
    if (!togglTimeEntry && timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(await handleCreateTogglEntry({ context, timesheeterTimesheetEntry }));
      continue;
    }

    // If only the toggl project exists and is deleted, delete the timesheeter project
    if (togglTimeEntry && togglTimeEntry.deleted && timesheeterTimesheetEntry) {
      updatedTimesheetEntryPairs.push(await deleteTimesheeterTimesheetEntry({ context, togglTimeEntry }));
      continue;
    }

    // Deleting of toggl time entries is handled via the api

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
