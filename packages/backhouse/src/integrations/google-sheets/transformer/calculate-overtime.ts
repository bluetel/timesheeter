import { NON_WORKING_PROJECT_NAME, TOIL_TASK_NAME } from '@timesheeter/web';
import { type GroupedEntry } from './lib';

const WORK_DAY_LENGTH_HOURS = 8;

/**  Need to calculate overtime, overtime is applied to each entry based on the hours already worked in that day, ie later entries might have overtime applied to them, earlier ones won't. There are 8 hours */
export const calculateOvertime = (
  groupedEntries: Omit<GroupedEntry, 'overtime'>[],
  isWorkDay: boolean
): GroupedEntry[] => {
  // If not a workday, then overtime is applied to all entries except non working entries
  if (!isWorkDay) {
    return calculateOvertimeNonWorkDay(groupedEntries);
  }

  let timeWorked = 0;

  return groupedEntries.map((groupedEntry) => {
    // If task name is TOIL_TASK_NAME then subtract overtime as time off in lieu
    if (
      groupedEntry.task.name.toUpperCase() === TOIL_TASK_NAME &&
      groupedEntry.task.project.name === NON_WORKING_PROJECT_NAME
    ) {
      return {
        ...groupedEntry,
        overtime: -groupedEntry.time,
      };
    }

    // If task name is NON_WORKING_PROJECT_NAME then don't apply overtime
    // Must also not be TOIL_TASK_NAME as that is a special case but we have already
    // handled that above
    if (groupedEntry.task.project.name === NON_WORKING_PROJECT_NAME) {
      return {
        ...groupedEntry,
        overtime: 0,
      };
    }

    let newGroupedEntry: GroupedEntry | null = null;

    if (timeWorked > WORK_DAY_LENGTH_HOURS) {
      newGroupedEntry = {
        ...groupedEntry,
        overtime: groupedEntry.time,
      };
    } else if (timeWorked + groupedEntry.time < WORK_DAY_LENGTH_HOURS) {
      newGroupedEntry = {
        ...groupedEntry,
        overtime: 0,
      };
    } else {
      // Only some of the time is overtime
      newGroupedEntry = {
        ...groupedEntry,
        overtime: timeWorked + groupedEntry.time - WORK_DAY_LENGTH_HOURS,
      };
    }

    timeWorked += groupedEntry.time;

    return newGroupedEntry;
  });
};

const calculateOvertimeNonWorkDay = (groupedEntries: Omit<GroupedEntry, 'overtime'>[]): GroupedEntry[] =>
  groupedEntries.map((groupedEntry) => ({
    ...groupedEntry,
    // Don't apply overtime to non working entries
    overtime: groupedEntry.projectName === NON_WORKING_PROJECT_NAME ? 0 : groupedEntry.time,
  }));
