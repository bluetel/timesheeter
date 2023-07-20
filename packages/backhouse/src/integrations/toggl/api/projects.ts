import { isoStringRegex } from '@timesheeter/web';
import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const togglProjectSchema = z.object({
  id: z.number().int().positive(),
  workspace_id: z.number().int().positive(),
  name: z.string(),
  created_at: z.string().regex(isoStringRegex),
  /** Updated at */
  at: z.string().regex(isoStringRegex),
});

export type TogglProject = z.infer<typeof togglProjectSchema>;

const togglProjectArraySchema = togglProjectSchema.array();

export const projectsGet = async ({
  axiosClient,
  path,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
  };
}) => {
  const response = await axiosClient.get(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/projects`);

  return togglProjectArraySchema.parse(response.data);
};

const togglProjectMutationSchema = z.object({
  active: z.boolean().default(true),
  is_private: z.boolean().default(false),
  name: z.string(),
});

export type TogglProjectMutation = z.infer<typeof togglProjectMutationSchema>;

export const projectsPost = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
  };
  body: TogglProjectMutation;
}) => {
  const response = await axiosClient.post(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/projects`, body);

  return togglProjectSchema.parse(response.data);
};

export const projectsPut = async ({
  axiosClient,
  path,
  body,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspaceId: number;
    projectId: number;
  };
  body: TogglProjectMutation;
}) => {
  const response = await axiosClient.put(
    `${API_BASE_URL}/api/v9/workspaces/${path.workspaceId}/projects/${path.projectId}`,
    body
  );

  return togglProjectSchema.parse(response.data);
};
