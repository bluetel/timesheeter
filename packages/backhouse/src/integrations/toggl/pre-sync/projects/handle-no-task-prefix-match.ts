import { TimesheeterProject } from '../../sync';
import { RawTogglProject, RawTogglTask } from '../../api';

export const handleNoTaskPrefixMatch = async ({
  description,
  togglProjects,
  timesheeterProjects,
  uncategorizedTasksProject,
  togglTasks,
}: {
  description: string;
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: RawTogglProject;
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
      autoAssignTrimmedDescription: null,
    };
  }

  return {
    matchedProject: uncategorizedTasksProject,
    updatedTogglProjects: togglProjects,
    updatedTimesheeterProjects: timesheeterProjects,
    taskName: description,
    autoAssignTrimmedDescription: null,
  };
};