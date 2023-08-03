import { matchTaskRegex } from '@timesheeter/web';
import { TogglIntegrationContext } from '../../lib';
import { TimesheeterProject } from '../../sync';
import { RawTogglProject, RawTogglTask, RawTogglTimeEntry } from '../../api';
import { handleNoTaskPrefixMatch } from './handle-no-task-prefix-match';
import { handleTaskPrefixMatch } from './handle-task-prefix-match';
import { findAutoAssignMatch, handleAutoAssign } from './handle-auto-assign';

export const matchTimeEntryToProject = async ({
  context,
  timeEntry,
  togglProjects,
  timesheeterProjects,
  uncategorizedTasksProject,
  togglTasks,
}: {
  context: TogglIntegrationContext;
  timeEntry: RawTogglTimeEntry;
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: RawTogglProject;
  togglTasks: RawTogglTask[];
}) => {
  // We match auto assign project regardless of user project selection
  const autoAssign = findAutoAssignMatch({ timeEntry, timesheeterProjects });

  if (autoAssign.match) {
    // We don't need to handle creating projects in timesheeter as we know that
    // they must exist
    return handleAutoAssign({
      context,
      autoAssignTimesheeterProject: autoAssign.timesheeterProject,
      autoAssignPrefix: autoAssign.autoAssignPrefix,
      togglProjects,
      timesheeterProjects,
      trimmedDescription: autoAssign.trimmedDescription,
    });
  }

  // The parent task may already be in a project, if so set the timesheeterProject to that project
  if (timeEntry.project_id) {
    const togglProject = togglProjects.find((project) => project.id === timeEntry.project_id);

    if (!togglProject) {
      throw new Error('Toggl project not found, this should exist as a task has it as a parent');
    }

    const matchResult = matchTaskRegex(timeEntry.description ?? '');

    // Even though the time entry has a project, the task prefix may not match
    if (matchResult.variant === 'with-task') {
      return handleTaskPrefixMatch({
        context,
        matchResult,
        togglProjects,
        timesheeterProjects,
        togglTasks,
        createInProject: togglProject,
      });
    }

    return {
      matchedProject: togglProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: matchResult.description,
      autoAssignTrimmedDescription: null,
    };
  }

  const parentTask = togglTasks.find((task) => task.id === timeEntry.task_id);

  if (parentTask) {
    const parentTaskProject = togglProjects.find((project) => project.id === parentTask?.id);

    if (parentTaskProject) {
      return {
        matchedProject: parentTaskProject,
        updatedTogglProjects: togglProjects,
        updatedTimesheeterProjects: timesheeterProjects,
        taskName: parentTask.name,
        autoAssignTrimmedDescription: null,
      };
    }
  }

  // There are no projects or tasks, so we need to create a new project

  const description = timeEntry.description;

  if (!description) {
    return {
      matchedProject: uncategorizedTasksProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: `Auto created by Timesheeter for time entry ${timeEntry.id}`,
      autoAssignTrimmedDescription: null,
    };
  }

  const matchResult = matchTaskRegex(description);

  if (matchResult.variant === 'with-task') {
    return handleTaskPrefixMatch({
      context,
      matchResult,
      togglProjects,
      timesheeterProjects,
      togglTasks,
    });
  }

  return handleNoTaskPrefixMatch({
    description,
    togglProjects,
    timesheeterProjects,
    uncategorizedTasksProject,
    togglTasks,
  });
};
