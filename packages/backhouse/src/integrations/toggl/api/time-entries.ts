import { isoStringRegex } from '@timesheeter/web';
import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const togglTimeEntrySchema = z
  .object({
    /** Updated at */
    at: z.string(),
    billable: z.boolean(),
    description: z.string().nullable(),
    id: z.number().int().positive(),
    project_id: z.number().int().positive().nullable(),
    start: z.string(),
    /** stop time in UTC, can be null if it's still running or created with "duration" and "duronly" fields */
    stop: z.string().nullable(),
    task_id: z.number().int().positive().nullable(),
    workspace_id: z.number().int().positive(),
    user_id: z.number().int().positive(),
  })
  .transform((data) => ({
    ...data,
    at: new Date(data.at),
  }));

export type RawTogglTimeEntry = z.infer<typeof togglTimeEntrySchema>;

const togglTimeEntryMutationSchema = z.object({
  created_with: z.string().default('Timesheeter'),
  description: z.string(),
  start: z.string().regex(isoStringRegex),
  stop: z.string().regex(isoStringRegex).nullable(),
  tag_action: z.enum(['add', 'delete']).default('add'),
  tag_ids: z.array(z.number().int().positive()).default([]),
  task_id: z.number().int().positive().optional(),
  user_id: z.number().int().positive(),
  workspace_id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  billable: z.boolean().default(true),
});

export type TogglTimeEntryMutation = z.infer<typeof togglTimeEntryMutationSchema>;

export const timeEntriesPost = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
  };
  body: TogglTimeEntryMutation;
}) => {
  const response = await axiosClient.post(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/time_entries`, body);

  return togglTimeEntrySchema.parse(response.data);
};

export const timeEntriesPut = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
    time_entry_id: number;
  };
  body: TogglTimeEntryMutation;
}) => {
  const response = await axiosClient.put(
    `${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/time_entries/${path.time_entry_id}`,
    body
  );

  return togglTimeEntrySchema.parse(response.data);
};

export const timeEntriesDelete = async ({
  axiosClient,
  path,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
    time_entry_id: number;
  };
}) => axiosClient.delete(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/time_entries/${path.time_entry_id}`);
