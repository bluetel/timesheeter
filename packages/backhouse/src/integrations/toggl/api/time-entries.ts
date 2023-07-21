import { isoStringRegex } from '@timesheeter/web';
import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const togglTimeEntrySchema = z
  .object({
    /** Updated at */
    at: z.string().regex(isoStringRegex),
    billable: z.boolean(),
    description: z.string().nullable(),
    id: z.number().int().positive(),
    project_id: z.number().int().positive().nullable(),
    server_deleted_at: z.string().regex(isoStringRegex).nullable(),
    start: z.string().regex(isoStringRegex),
    /** stop time in UTC, can be null if it's still running or created with "duration" and "duronly" fields */
    stop: z.string().regex(isoStringRegex).nullable(),
    tag_ids: z.array(z.number().int().positive()),
    tags: z.array(z.string()),
    task_id: z.number().int().positive().nullable(),
    workspace_id: z.number().int().positive(),
    user_id: z.number().int().positive(),
  })
  .transform((data) => ({
    ...data,
    at: data.server_deleted_at ? new Date(data.server_deleted_at) : new Date(data.at),
    server_deleted_at: data.server_deleted_at ? new Date(data.server_deleted_at) : null,
    deleted: !!data.server_deleted_at,
  }));

export type TogglTimeEntry = z.infer<typeof togglTimeEntrySchema>;

const togglTimeEntryArraySchema = togglTimeEntrySchema.array();

export const timeEntriesGet = async ({
  axiosClient,
  path,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    start_date: Date;
    end_date: Date;
  };
}) => {
  const response = await axiosClient.get(`${API_BASE_URL}/api/v9/me/time_entries`, {
    params: {
      start_date: path.start_date.toISOString(),
      end_date: path.end_date.toISOString(),
      user_agent: 'timesheeter',
    },
  });

  return togglTimeEntryArraySchema.parse(response.data);
};

const togglTimeEntryMutationSchema = z.object({
  billable: z.boolean().default(false),
  created_with: z.string().default('Timesheeter'),
  description: z.string().optional(),
  start: z.string().regex(isoStringRegex),
  stop: z.string().regex(isoStringRegex).optional(),
  tag_action: z.enum(['add', 'delete']).default('add'),
  tag_ids: z.array(z.number().int().positive()).optional(),
  task_id: z.number().int().positive().optional(),
  user_id: z.number().int().positive().optional(),
  workspace_id: z.number().int().positive(),
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
  const response = await axiosClient.post(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/time_entries"`, body);

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
