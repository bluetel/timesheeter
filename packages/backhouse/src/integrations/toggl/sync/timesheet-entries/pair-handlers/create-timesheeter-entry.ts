import { TogglIntegrationContext } from '../../../lib';
import { EvaluatedTaskPair } from '../../tasks';
import { FilteredTogglTimeEntry, TimesheetEntryPair } from '../data';
import { createTimesheeterTimesheetEntry } from '../mutations';

export const handleCreateTimesheeterEntry = async ({
  context,
  togglTimeEntry,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: FilteredTogglTimeEntry;
  syncedTaskPairs: EvaluatedTaskPair[];
}): Promise<TimesheetEntryPair> => {
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
    return { togglTimeEntry, timesheeterTimesheetEntry: null };
  }

  if (!togglTimeEntry.task_id) {
    console.warn(
      `The toggl time entry with id ${togglTimeEntry.id} does not have a task id, this may occasionaly happen if an entry was created after pre-sync but before sync. This could alternatively be a bug, but it resolves itself on the next sync.`
    );

    return { togglTimeEntry, timesheeterTimesheetEntry: null };
  }

  const timesheeterTaskId = syncedTaskPairs.find(
    (syncedTaskPair) => syncedTaskPair.togglTask.id === togglTimeEntry.task_id
  )?.timesheeterTask?.id;

  if (!timesheeterTaskId) {
    throw new Error(
      `Toggl task id does not have a timesheeter task id, this should have been set in the sync tasks step, task id: ${togglTimeEntry.task_id}`
    );
  }

  return createTimesheeterTimesheetEntry({ context, togglTimeEntry, timesheeterUserId, timesheeterTaskId });
};