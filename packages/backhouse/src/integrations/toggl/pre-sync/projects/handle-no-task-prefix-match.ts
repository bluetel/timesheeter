import { type TimesheeterProject } from '../../sync';
import { type RawTogglProject, type RawTogglTask } from '../../api';

export const handleNoTaskPrefixMatch = async ({
  description,
  togglProjects,
  timesheeterProjects,
  togglTasks,
}: {
  description: string;
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  togglTasks: RawTogglTask[];
}) => {
  // See if any existing tasks match the task name
  const existingTogglTask = togglTasks.find((task) => task.name === description);

  if (existingTogglTask) {
    const existingTogglProject = togglProjects.find((project) => project.id === existingTogglTask?.project_id);

    if (!existingTogglProject) {
      throw new Error('Toggl project not found, this should exist as a task has it as a parent');
    }

    return {
      matchedProject: existingTogglProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: description,
    };
  }

  return {
    updatedTogglProjects: togglProjects,
    updatedTimesheeterProjects: timesheeterProjects,
    taskName: description,
  };
};
