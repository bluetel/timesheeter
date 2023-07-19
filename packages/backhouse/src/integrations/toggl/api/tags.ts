import { isoStringRegex } from '@timesheeter/web';
import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const togglTagSchema = z.object({
  at: z.string().regex(isoStringRegex),
  deleted_at: z.string().optional(),
  id: z.number().int().positive(),
  name: z.string(),
  workspace_id: z.number().int().positive(),
});

export type TogglTag = z.infer<typeof togglTagSchema>;

const togglTagArraySchema = togglTagSchema.array();

export const tagsGet = async ({
  axiosClient,
  path,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
  };
}) => {
  const response = await axiosClient.get(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/tags`);

  return togglTagArraySchema.parse(response.data);
};

const togglTagMutationSchema = z.object({
  name: z.string(),
  workspace_id: z.number().int().positive(),
});

export type TogglTagMutation = z.infer<typeof togglTagMutationSchema>;

export const tagsPost = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
  };
  body: TogglTagMutation;
}) => {
  const response = await axiosClient.post(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/tags`, body);

  return togglTagSchema.parse(response.data);
};

export const tagsPut = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
    tag_id: number;
  };
  body: TogglTagMutation;
}) => {
  const response = await axiosClient.put(
    `${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/tags/${path.tag_id}`,
    body
  );

  return togglTagSchema.parse(response.data);
};
