import { TogglIntegrationContext } from '../../../lib';
import { TimesheetEntryPair, TimesheeterTimesheetEntry } from '../data';
import { createTogglTimeEntry } from '../mutations';

export const handleCreateTogglEntry = async ({
  context,
  timesheeterTimesheetEntry,
}: {
  context: TogglIntegrationContext;
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
}): Promise<TimesheetEntryPair> => {
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
    return { togglTimeEntry: null, timesheeterTimesheetEntry };
  }

  if (!timesheeterTimesheetEntry.task.togglTaskId) {
    throw new Error(
      `Timesheeter task does not have a toggl task id, this should have been set in the sync tasks step, task id: ${timesheeterTimesheetEntry.task.id}`
    );
  }

  return createTogglTimeEntry({
    context,
    timesheeterTimesheetEntry,
    togglUserId: Number(togglUserId),
    togglTaskId: Number(timesheeterTimesheetEntry.task.togglTaskId),
  });
};
