import { TogglTask } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import { EvaluatedProjectPair } from '../projects';
import { EvaluatedTaskPair, TaskPair, TimesheeterTask, createTaskPairs } from './data';
import {
  createTimesheeterTask,
  createTogglTask,
  deleteTimesheeterTask,
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

    // If both tasks exist, update the timesheeter task with the toggl task data
    if (togglTask && !togglTask.deleted && timesheeterTask) {
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
    if (!togglTask && timesheeterTask) {
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

    // If only the toggl task exists and is deleted, delete the timesheeter task
    if (togglTask && togglTask.deleted && timesheeterTask) {
      updatedTaskPairs.push(await deleteTimesheeterTask({ context, togglTask }));
      continue;
    }

    // Deleting of toggl tasks is handled via the api

    console.warn('Unreachable code reached in syncTasks');
    updatedTaskPairs.push(taskPair);
  }

  // Ensure that all pairs have a toggl task
  return updatedTaskPairs
    .map((taskPair) => {
      if (taskPair.togglTask) {
        return taskPair as EvaluatedTaskPair;
      }

      return null;
    })
    .filter((taskPair): taskPair is EvaluatedTaskPair => !!taskPair);
};

export * from './data';

const tasksAreTheSame = (togglTask: TogglTask, timesheeterTask: TimesheeterTask): boolean => {
  return (
    togglTask.name === timesheeterTask.name &&
    BigInt(togglTask.id) === timesheeterTask.togglTaskId &&
    togglTask.project_id.toString() === timesheeterTask.project?.id.toString()
  );
};
