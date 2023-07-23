import axios from 'axios';
import rateLimit from 'axios-rate-limit';

export const API_BASE_URL = 'https://api.track.toggl.com';

export const getAxiosClient = ({ apiKey }: { apiKey: string }) => {
  const axiosClient = rateLimit(
    axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:api_token`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    }),
    { maxRequests: 1, perMilliseconds: 1000 }
  );

  // This is useful for debugging

  // axiosClient.interceptors.request.use((request) => {
  //   console.log('Starting Request', request.method, request.url);
  //   return request;
  // });

  return axiosClient;
};

export type RateLimitedAxiosClient = ReturnType<typeof getAxiosClient>;
