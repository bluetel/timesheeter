import { UNCATEGORIZED_TASKS_TASK_NAME, matchTaskRegex } from '@timesheeter/web';
import { type TogglIntegrationContext } from '../../lib';
import { type TimesheeterProject } from '../../sync';
import { type RawTogglProject, type RawTogglTask, type RawTogglTimeEntry } from '../../api';
import { handleTaskPrefixMatch } from './handle-task-prefix-match';
import { addPromptToEntry, clearPromptsFromDescription, promptMessages } from '../../prompts';

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
  togglTasks: RawTogglTask[];
}) => {
  // Catch cases where user has not set a project
  if (!timeEntry.project_id) {
    await addPromptToEntry({
      context,
      togglTimeEntry: timeEntry,
      promptMessage: promptMessages.ADD_PROJECT,
    });

    return null;
  }

  // Remove any prompts from the description
  const descriptionNoPrompt = clearPromptsFromDescription(timeEntry.description ?? '');

  // Handle no description or task_id by creating a default task in the project
  if (!descriptionNoPrompt && !timeEntry.task_id) {
    const parentProject = togglProjects.find((project) => project.id === timeEntry.project_id);

    if (!parentProject) {
      throw new Error('Toggl project not found, this should exist as a task has it as a parent');
    }

    return {
      matchedProject: parentProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: UNCATEGORIZED_TASKS_TASK_NAME,
    };
  }

  const togglProject = togglProjects.find((project) => project.id === timeEntry.project_id);
  if (!togglProject) {
    throw new Error('Toggl project not found, this should exist as a task has it as a parent');
  }

  const matchResult = matchTaskRegex(descriptionNoPrompt);

  // Even though the time entry has a project, the task prefix may not match
  if (matchResult.variant === 'with-task') {
    return handleTaskPrefixMatch({
      context,
      matchResult,
      togglProjects,
      timesheeterProjects,
      togglTasks,
      togglProject,
    });
  }

  return {
    matchedProject: togglProject,
    updatedTogglProjects: togglProjects,
    updatedTimesheeterProjects: timesheeterProjects,
    taskName: matchResult.description,
  };
};
