import { API_BASE_URL, type RateLimitedAxiosClient } from './client';
import { z } from 'zod';

const meResponseSchema = z.object({
  default_workspace_id: z.number().int().positive(),
  workspaces: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
    })
    .array(),
});

export const meGet = async ({ axiosClient }: { axiosClient: RateLimitedAxiosClient }) => {
  const response = await axiosClient.get(`${API_BASE_URL}/api/v9/me`, {
    params: {
      with_related_data: true,
    },
  });

  return meResponseSchema.parse(response.data);
};
