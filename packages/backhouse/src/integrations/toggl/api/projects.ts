import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const togglProjectSchema = z
  .object({
    id: z.number().int().positive(),
    workspace_id: z.number().int().positive(),
    name: z.string(),
    at: z.string(),
    billable: z.boolean().nullable(),
  })
  .transform((data) => ({
    ...data,
    at: new Date(data.at),
  }));

export type RawTogglProject = z.infer<typeof togglProjectSchema>;

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
    workspace_id: number;
    project_id: number;
  };
  body: TogglProjectMutation;
}) => {
  const response = await axiosClient.put(
    `${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/projects/${path.project_id}`,
    body
  );

  return togglProjectSchema.parse(response.data);
};

export const projectsDelete = async (_: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
    project_id: number;
  };
}) => {
  // Temporarily disable deletes
  // axiosClient.delete(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/projects/${path.project_id}`);
};
