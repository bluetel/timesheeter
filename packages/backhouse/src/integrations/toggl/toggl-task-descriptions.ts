import { matchTaskRegex } from '@timesheeter/web';
import { type EvaluatedTaskPair } from './sync';
import { toggl } from './api';
import { type TogglIntegrationContext } from './lib';

/**
 * Toggl Task Names can be in the following form:
 * NA-1234: Some task name
 *
 * We want to extract just the task Number if it exists, else return the whole name
 */
export const resolveTaskNumberFromTogglDescriptions = (rawDescription: string): string => {
  const matchResult = matchTaskRegex(rawDescription);

  if (matchResult.variant === 'jira-based') {
    return `${matchResult.prefix}-${matchResult.taskNumber}`;
  }

  // We want to return rawDescription here, not filtered task name as it may contain
  // a colon
  return matchResult.taskName;
};

/**
 * Applies up to date task descriptions to all time entries that have a task number
 *
 * This is a one way sync from timesheeter to toggl
 */
export const applyTaskDescriptions = async ({
  context,
  syncedTaskPairs,
}: {
  context: TogglIntegrationContext;
  syncedTaskPairs: EvaluatedTaskPair[];
}) =>
  Promise.all(
    syncedTaskPairs.map(async ({ togglTask, timesheeterTask }) => {
      if (!togglTask || !timesheeterTask) {
        return;
      }

      const togglMatchResult = matchTaskRegex(togglTask.name);

      // We only want to update tasks that have a task number
      if (togglMatchResult.variant === 'description-based') {
        return;
      }

      const formattedTimesheeterTaskName = timesheeterTask.name.trim();

      if (togglMatchResult.description === formattedTimesheeterTaskName || formattedTimesheeterTaskName === '') {
        return;
      }

      await toggl.tasks.put({
        axiosClient: context.axiosClient,
        path: { workspace_id: context.togglWorkspaceId, task_id: togglTask.id, project_id: togglTask.project_id },
        body: {
          ...togglTask,
          estimated_seconds: 0,
          name: `${togglMatchResult.prefix}-${togglMatchResult.taskNumber}: ${formattedTimesheeterTaskName}`,
        },
      });
    })
  );
