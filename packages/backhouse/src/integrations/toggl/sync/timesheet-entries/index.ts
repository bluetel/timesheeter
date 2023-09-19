import { TogglIntegrationContext } from '../../lib';
import { EvaluatedTaskPair } from '../tasks';
import { EvaluatedTimesheetEntryPair, TimesheetEntryPair, createTimesheetEntryPairs } from './data';
import { deleteTimesheeterTimesheetEntry, deleteTogglTimeEntry } from './mutations';
import { handleTwoWayUpdates, handleCreateTimesheeterEntry, handleCreateTogglEntry } from './pair-handlers';

export const syncTimesheetEntries = async ({
  context,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  syncedTaskPairs: EvaluatedTaskPair[];
}): Promise<EvaluatedTimesheetEntryPair[]> => {
  const timesheetEntryPairs = await createTimesheetEntryPairs({ context });

  // As we update the timesheeter timesheet entries in the loop, we need to store the updated imesheet entries
  const updatedTimesheetEntryPairs = [] as TimesheetEntryPair[];

  // Loop through all project pairs and create/update/delete imesheet entries as needed
  for (const timesheetEntryPair of timesheetEntryPairs) {
    try {
      const { togglTimeEntry, timesheeterTimesheetEntry } = timesheetEntryPair;

      if (togglTimeEntry && timesheeterTimesheetEntry) {
        // If both are marked as deleted, skip
        if (togglTimeEntry.deleted && timesheeterTimesheetEntry.deleted) {
          updatedTimesheetEntryPairs.push(timesheetEntryPair);
          continue;
        }

        // If both imesheet entries exist and not deleted, determine which one is newer and update the older one with the newer one
        if (!togglTimeEntry.deleted && !timesheeterTimesheetEntry.deleted) {
          updatedTimesheetEntryPairs.push(
            await handleTwoWayUpdates({ context, togglTimeEntry, timesheeterTimesheetEntry, syncedTaskPairs })
          );
          continue;
        }

        // If the toggl project is deleted, delete the timesheeter project
        if (togglTimeEntry.deleted && !timesheeterTimesheetEntry.deleted) {
          updatedTimesheetEntryPairs.push(await deleteTimesheeterTimesheetEntry({ context, togglTimeEntry }));
          continue;
        }

        // If the timesheeter project is deleted, delete the toggl project
        if (!togglTimeEntry.deleted && timesheeterTimesheetEntry.deleted) {
          updatedTimesheetEntryPairs.push(await deleteTogglTimeEntry({ context, togglTimeEntry }));
          continue;
        }
      }

      // If only the toggl time entry exists and not deleted, create a new timesheeter timesheet entry
      if (togglTimeEntry && !togglTimeEntry.deleted && !timesheeterTimesheetEntry) {
        updatedTimesheetEntryPairs.push(
          await handleCreateTimesheeterEntry({ context, togglTimeEntry, syncedTaskPairs })
        );
        continue;
      }

      // If only the timesheeter timesheet entry exists, create a new toggl time entry
      if (!togglTimeEntry && timesheeterTimesheetEntry && !timesheeterTimesheetEntry.deleted) {
        updatedTimesheetEntryPairs.push(await handleCreateTogglEntry({ context, timesheeterTimesheetEntry }));
        continue;
      }

      console.warn('Unreachable code reached in syncTimesheetEntries');
      updatedTimesheetEntryPairs.push(timesheetEntryPair);
    } catch (e) {
      console.log('Error in syncTimesheetEntries', e);
    }
  }

  // Ensure that all pairs have a toggl time entry and a timesheeter timesheet entry
  return updatedTimesheetEntryPairs
    .map((timesheetEntryPair) => {
      if (timesheetEntryPair.togglTimeEntry?.deleted === false && timesheetEntryPair.timesheeterTimesheetEntry) {
        return timesheetEntryPair as EvaluatedTimesheetEntryPair;
      }

      console.log('Toggl - Sync Timesheet Pair Filtered as invalid', timesheetEntryPair);
      return null;
    })
    .filter((timesheetEntryPair): timesheetEntryPair is EvaluatedTimesheetEntryPair => !!timesheetEntryPair);
};
