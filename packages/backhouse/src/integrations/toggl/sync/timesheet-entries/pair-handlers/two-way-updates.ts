import { type TogglIntegrationContext } from '../../../lib';
import { type EvaluatedTaskPair } from '../../tasks';
import { type TimesheetEntryPair, type TimesheeterTimesheetEntry, type TogglTimeEntry } from '../data';
import { updateTimesheeterTimesheetEntry, updateTogglTimeEntry } from '../mutations';

export const handleTwoWayUpdates = async ({
  context,
  togglTimeEntry,
  timesheeterTimesheetEntry,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
    stop: string;
  };
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
  syncedTaskPairs: EvaluatedTaskPair[];
}): Promise<TimesheetEntryPair> => {
  // If both unchanged, skip and return the original pair
  if (timesheetEntriesAreTheSame(context, togglTimeEntry, timesheeterTimesheetEntry)) {
    return { togglTimeEntry, timesheeterTimesheetEntry };
  }

  // Check to see which project has been updated more recently, then copy the data from the newer entry to the older one

  if (togglTimeEntry.at > timesheeterTimesheetEntry.updatedAt) {
    // Update the timesheeter timesheet entry from toggl
    return handleUpdateTimesheeterTimesheetEntry({
      context,
      togglTimeEntry,
      timesheeterTimesheetEntry,
      syncedTaskPairs,
    });
  }

  // Update the toggl time entry from timesheeter
  return handleUpdateTogglTimeEntry({ context, togglTimeEntry, timesheeterTimesheetEntry });
};

const timesheetEntriesAreTheSame = (
  context: TogglIntegrationContext,
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
    stop: string;
  },
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry
): boolean => {
  if (!timesheeterTimesheetEntry.task.togglTaskId) {
    throw new Error(
      `Timesheeter task does not have a toggl task id, this should have been set in the sync tasks step, task id: ${timesheeterTimesheetEntry.task.id}`
    );
  }

  // Date formatting can be inconsistent from Toggl, so we need to reformat it
  return (
    new Date(togglTimeEntry.start).toISOString() === timesheeterTimesheetEntry.start.toISOString() &&
    new Date(togglTimeEntry.stop).toISOString() === timesheeterTimesheetEntry.end.toISOString() &&
    (togglTimeEntry.description ?? '') === (timesheeterTimesheetEntry.description ?? '') &&
    BigInt(togglTimeEntry.id) === timesheeterTimesheetEntry.togglTimeEntryId &&
    context.togglIdToEmail[togglTimeEntry.user_id] ===
      context.timesheeterUserIdToEmail[timesheeterTimesheetEntry.userId] &&
    togglTimeEntry.task_id === Number(timesheeterTimesheetEntry.task.togglTaskId)
  );
};

const handleUpdateTimesheeterTimesheetEntry = async ({
  context,
  togglTimeEntry,
  timesheeterTimesheetEntry,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
    stop: string;
  };
  timesheeterTimesheetEntry: TimesheeterTimesheetEntry;
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
    // Nothing we can do here as we cannot assign in timesheeter without a user id
    return { togglTimeEntry, timesheeterTimesheetEntry };
  }

  const timesheeterTaskId = syncedTaskPairs.find(
    (syncedTaskPair) => syncedTaskPair.togglTask.id === togglTimeEntry.task_id
  )?.timesheeterTask?.id;

  if (!timesheeterTaskId) {
    throw new Error(
      `Toggl task id does not have a timesheeter task id, this should have been set in the sync tasks step, task id: ${togglTimeEntry.task_id}`
    );
  }

  return updateTimesheeterTimesheetEntry({
    context,
    timesheeterTimesheetEntry,
    togglTimeEntry,
    updatedTimesheeterTaskId: timesheeterTaskId,
    updatedTimesheeterUserId: timesheeterUserId,
  });
};

const handleUpdateTogglTimeEntry = async ({
  context,
  togglTimeEntry,
  timesheeterTimesheetEntry,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: TogglTimeEntry & {
    deleted: false;
  };
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
    return { togglTimeEntry, timesheeterTimesheetEntry };
  }

  if (!timesheeterTimesheetEntry.task.togglTaskId) {
    throw new Error(
      `Timesheeter task does not have a toggl task id, this should have been set in the sync tasks step, task id: ${timesheeterTimesheetEntry.task.id}`
    );
  }

  // Update the toggl time entry with the timesheeter timesheet entry data
  return updateTogglTimeEntry({
    context,
    timesheeterTimesheetEntry,
    togglTimeEntry,
    updatedTogglTaskId: Number(timesheeterTimesheetEntry.task.togglTaskId),
    updatedTogglUserId: Number(togglUserId),
  });
};
