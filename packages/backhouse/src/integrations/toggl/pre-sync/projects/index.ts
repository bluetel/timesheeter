import { matchTaskRegex } from '@timesheeter/web';
import { TogglIntegrationContext } from '../../lib';
import { TimesheeterProject } from '../../sync';
import { RawTogglProject, RawTogglTask, RawTogglTimeEntry, toggl } from '../../api';
import { handleTaskPrefixMatch } from './handle-task-prefix-match';
import { findAutoAssignMatch, handleAutoAssign } from './handle-auto-assign';
import { handleNoDescription } from './handle-no-description';

export const matchTimeEntryToProject = async ({
  context,
  timeEntry,
  togglProjects,
  timesheeterProjects,
  togglTasks,
}: {
  context: TogglIntegrationContext;
  timeEntry: RawTogglTimeEntry;
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: RawTogglProject;
  togglTasks: RawTogglTask[];
}) => {
  // Edge case where user sets a project but nothing more
  if (!timeEntry.description && !timeEntry.task_id && !!timeEntry.project_id) {
    // We are ignoring entries with no description for now
    return null;
    // return handleNoDescription({
    //   timeEntry,
    //   togglProjects,
    //   timesheeterProjects,
    //   uncategorizedTasksProject,
    // });
  }

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

    // We are ignoring entries with no task prefix match for now
    return null;
    // return {
    //   matchedProject: togglProject,
    //   updatedTogglProjects: togglProjects,
    //   updatedTimesheeterProjects: timesheeterProjects,
    //   taskName: matchResult.description,
    //   autoAssignTrimmedDescription: null,
    // };
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
    // We are ignoring entries with no description for now
    return null;
    // return {
    //   matchedProject: uncategorizedTasksProject,
    //   updatedTogglProjects: togglProjects,
    //   updatedTimesheeterProjects: timesheeterProjects,
    //   taskName: `Auto created by Timesheeter for time entry ${timeEntry.id}`,
    //   autoAssignTrimmedDescription: null,
    // };
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

  // We are ignoring entries with no task prefix match for now
  return null;
  // return handleNoTaskPrefixMatch({
  //   description,
  //   togglProjects,
  //   timesheeterProjects,
  //   uncategorizedTasksProject,
  //   togglTasks,
  // });
};
