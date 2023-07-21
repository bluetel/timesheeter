import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const togglUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string(),
});

export type TogglUser = z.infer<typeof togglUserSchema>;

const togglUserArraySchema = togglUserSchema.array();

export const usersGet = async ({
  axiosClient,
  path,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
  };
}) => {
  const response = await axiosClient.get(`${API_BASE_URL}/api/v9/workspaces/${path.workspace_id}/users`);

  return togglUserArraySchema.parse(response.data);
};
