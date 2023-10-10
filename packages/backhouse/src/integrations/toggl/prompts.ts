/**
 * @description Helpers that instruct the end user on how to fix issues with sync not being possible from inside toggl
 */

import { type RawTogglTimeEntry, toggl } from './api';
import { type TogglIntegrationContext } from './lib';

const promptRegex = /MESSAGE:.*::/;

export const promptMessages = {
  ADD_PROJECT: 'Please add project',
} as const;

type PromptMessage = (typeof promptMessages)[keyof typeof promptMessages];

export const addPromptToEntry = async ({
  context,
  togglTimeEntry,
  promptMessage,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: RawTogglTimeEntry;
  // Oneof the prompt messages values
  promptMessage: PromptMessage;
}) => {
  // See if the time entry already has a prompt (starts with MESSAGE: and contains :: somewhere may be in the middle or end)
  let description = togglTimeEntry.description ?? '';

  const existingPrompt = description.match(promptRegex);

  if (existingPrompt) {
    // If it does, then we need to update the prompt
    description = description.replace(promptRegex, `${promptMessage}::`);
    return;
  } else {
    // If it doesn't, then we need to add the prompt
    description = `MESSAGE: ${promptMessage}:: ${description.trim()}`;
  }

  return toggl.timeEntries.put({
    axiosClient: context.axiosClient,
    path: { time_entry_id: togglTimeEntry.id, workspace_id: context.togglWorkspaceId },
    body: {
      ...togglTimeEntry,
      project_id: togglTimeEntry.project_id ?? undefined,
      task_id: togglTimeEntry.task_id ?? undefined,
      description,
      created_with: 'timesheeter',
      tag_action: 'add',
      tag_ids: [],
    },
  });
};

export const clearPromptsFromEntry = async ({
  context,
  togglTimeEntry,
}: {
  context: TogglIntegrationContext;
  togglTimeEntry: RawTogglTimeEntry;
}) => {
  // See if the time entry already has a prompt (starts with MESSAGE: and contains :: somewhere may be in the middle or end)
  let description = togglTimeEntry.description ?? '';

  const existingPrompt = description.match(promptRegex);

  if (!existingPrompt) {
    // If it doesn't, then we don't need to do anything
    return togglTimeEntry;
  }

  // If it does, then we need to remove the prompt
  description = clearPromptsFromDescription(description);

  return toggl.timeEntries.put({
    axiosClient: context.axiosClient,
    path: { time_entry_id: togglTimeEntry.id, workspace_id: context.togglWorkspaceId },
    body: {
      ...togglTimeEntry,
      project_id: togglTimeEntry.project_id ?? undefined,
      task_id: togglTimeEntry.task_id ?? undefined,
      description,
      created_with: 'timesheeter',
      tag_action: 'add',
      tag_ids: [],
    },
  });
};

export const clearPromptsFromDescription = (description: string) => description.replace(promptRegex, '').trim();
