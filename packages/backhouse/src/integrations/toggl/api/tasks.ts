import { isoStringRegex } from '@timesheeter/web';
import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const togglTaskSchema = z.object({
  active: z.boolean(),
  /** Updated at */
  at: z.string().regex(isoStringRegex),
  estimated_seconds: z.number().int().positive().nullable(),
  id: z.number().int().positive(),
  name: z.string(),
  project_id: z.number().int().positive(),
  recurring: z.boolean(),
  server_deleted_at: z.string().nullable(),
  /** This is in milliseconds, not seconds */
  tracked_seconds: z.number().int().positive(),
  user_id: z.number().int().positive().nullable(),
  workspace_id: z.number().int().positive(),
});

export type TogglTask = z.infer<typeof togglTaskSchema>;

const togglTaskArraySchema = togglTaskSchema.array();

export const tasksGet = async ({
  axiosClient,
  path,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
    project_id: number;
  };
}) => {
  const response = await axiosClient.get(
    `${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/projects/${path.project_id}/tasks`
  );

  return togglTaskArraySchema.parse(response.data);
};

const togglTaskMutationSchema = z.object({
  active: z.boolean().default(true),
  /** Estimated task length in seconds */
  estimated_seconds: z.number().int().positive().nullable().default(null),
  name: z.string(),
  project_id: z.number().int().positive(),
  user_id: z.number().int().positive().nullable(),
  workspace_id: z.number().int().positive(),
});

export type TogglTaskMutation = z.infer<typeof togglTaskMutationSchema>;

export const tasksPost = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
    project_id: number;
  };
  body: TogglTaskMutation;
}) => {
  const response = await axiosClient.post(
    `${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/projects/${path.project_id}/tasks`,
    body
  );

  return togglTaskSchema.parse(response.data);
};

export const tasksPut = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
    project_id: number;
    task_id: number;
  };
  body: TogglTaskMutation;
}) => {
  const response = await axiosClient.put(
    `${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/projects/${path.project_id}/tasks/${path.task_id}`,
    body
  );

  return togglTaskSchema.parse(response.data);
};
