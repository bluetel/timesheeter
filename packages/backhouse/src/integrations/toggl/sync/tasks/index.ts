import { matchTaskRegex } from '@timesheeter/web';
import { TogglIntegrationContext } from '../../lib';
import { EvaluatedProjectPair } from '../projects';
import { EvaluatedTaskPair, TaskPair, TimesheeterTask, TogglTask, createTaskPairs } from './data';
import {
  createTimesheeterTask,
  createTogglTask,
  deleteTimesheeterTask,
  deleteTogglTask,
  updateTimesheeterTask,
  updateTogglTask,
} from './mutations';

export const syncTasks = async ({
  context,
  syncedProjectPairs,
}: {
  context: TogglIntegrationContext;
  syncedProjectPairs: EvaluatedProjectPair[];
}): Promise<EvaluatedTaskPair[]> => {
  const taskPairs = await createTaskPairs({ context, syncedProjectPairs });

  // As we update the timesheeter tasks in the loop, we need to store the updated tasks
  const updatedTaskPairs = [] as TaskPair[];

  // Loop through all task pairs and create/update/delete tasks as needed
  for (const taskPair of taskPairs) {
    const { togglTask, timesheeterTask } = taskPair;

    if (togglTask && timesheeterTask) {
      // If both are marked as deleted, skip
      if (togglTask.deleted && timesheeterTask.deleted) {
        updatedTaskPairs.push(taskPair);
        continue;
      }

      // If both tasks exist, update the timesheeter task with the toggl task data
      if (!togglTask.deleted && !timesheeterTask.deleted) {
        // If both unchanged, skip
        if (tasksAreTheSame(togglTask, timesheeterTask)) {
          updatedTaskPairs.push(taskPair);
          continue;
        }

        // Check to see which task has been updated more recently, then copy the data from the newer task to the older one

        if (togglTask.at > timesheeterTask.updatedAt) {
          // Update the timesheeter task with the toggl task data
          const updatedTimesheeterProjectId = syncedProjectPairs.find(
            (projectPair) => projectPair.togglProject.id === togglTask.project_id
          )?.timesheeterProject?.id;

          if (!updatedTimesheeterProjectId) {
            throw new Error(
              `updateTimesheeterTask error - could not find timesheeter project for toggl project ${togglTask.project_id}`
            );
          }

          updatedTaskPairs.push(
            await updateTimesheeterTask({ context, timesheeterTask, togglTask, updatedTimesheeterProjectId })
          );
          continue;
        }

        const updatedTogglProjectId = syncedProjectPairs.find(
          (projectPair) => projectPair.timesheeterProject?.id === timesheeterTask.projectId
        )?.togglProject.id;

        if (!updatedTogglProjectId) {
          throw new Error(
            `updateTogglTask error - could not find toggl project for timesheeter project ${timesheeterTask.projectId}`
          );
        }

        // Update the toggl task with the timesheeter task data
        updatedTaskPairs.push(await updateTogglTask({ context, timesheeterTask, togglTask, updatedTogglProjectId }));
        continue;
      }

      // If the toggl task is deleted, delete the timesheeter task
      if (togglTask.deleted && !timesheeterTask.deleted) {
        updatedTaskPairs.push(await deleteTimesheeterTask({ context, togglTask }));
        continue;
      }

      // If the timesheeter task is deleted, delete the toggl task
      if (!togglTask.deleted && timesheeterTask.deleted) {
        updatedTaskPairs.push(await deleteTogglTask({ context, togglTask, timesheeterTask }));
        continue;
      }
    }

    // If only the toggl task exists and not deleted, create a new timesheeter task
    if (togglTask && !togglTask.deleted && !timesheeterTask) {
      const timesheeterProjectId = syncedProjectPairs.find(
        (projectPair) => projectPair.togglProject.id === togglTask.project_id
      )?.timesheeterProject?.id;

      if (!timesheeterProjectId) {
        throw new Error(
          `createTimesheeterTask error - could not find timesheeter project for toggl project ${togglTask.project_id}`
        );
      }

      updatedTaskPairs.push(await createTimesheeterTask({ context, togglTask, timesheeterProjectId }));
      continue;
    }

    // If only the timesheeter task exists, create a new toggl task
    if (!togglTask && timesheeterTask && !timesheeterTask.deleted) {
      const togglProjectId = syncedProjectPairs.find(
        (projectPair) => projectPair.timesheeterProject?.id === timesheeterTask.projectId
      )?.togglProject.id;

      if (!togglProjectId) {
        throw new Error(
          `createTogglTask error - could not find toggl project for timesheeter project ${timesheeterTask.projectId}`
        );
      }

      updatedTaskPairs.push(await createTogglTask({ context, timesheeterTask, togglProjectId }));
      continue;
    }

    updatedTaskPairs.push(taskPair);
  }

  // Ensure that all pairs have a toggl task and a timesheeter task
  return updatedTaskPairs
    .map((taskPair) => {
      if (taskPair.togglTask?.deleted === false && taskPair.timesheeterTask) {
        return taskPair as EvaluatedTaskPair;
      }

      return null;
    })
    .filter((taskPair): taskPair is EvaluatedTaskPair => !!taskPair);
};

export * from './data';

const tasksAreTheSame = (
  togglTask: TogglTask & {
    deleted: false;
  },
  timesheeterTask: TimesheeterTask
): boolean => {
  const baseCondition =
    BigInt(togglTask.id) === timesheeterTask.togglTaskId &&
    togglTask.project_id.toString() === timesheeterTask.project?.togglProjectId?.toString();

  if (!baseCondition) {
    return false;
  }

  const togglMatchResult = matchTaskRegex(togglTask.name);

  if (togglMatchResult.variant === 'no-task') {
    // As there is no task number, we can just compare the names
    return togglMatchResult.description === timesheeterTask.name;
  }

  // As there is a task number, we need to compare the toggl task name with the timesheeter ticketForTask
  const togglPrefixedTaskNumber = `${togglMatchResult.prefix}-${togglMatchResult.taskNumber}`;
  const timesheeterPrefixedTaskNumber = `${timesheeterTask.ticketForTask?.taskPrefix.prefix}-${timesheeterTask.ticketForTask?.number}`;

  return togglPrefixedTaskNumber === timesheeterPrefixedTaskNumber;
};
