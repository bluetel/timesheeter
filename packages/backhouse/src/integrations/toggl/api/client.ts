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
  axiosClient.interceptors.request.use((request) => {
    // stop deletes for now
    if (request.method === 'delete') {
      console.log('Skipping Request delete', request.method, request.url);
      return Promise.reject(new Error('Skipping Request'));
    }

    console.log('Starting Request', request.method, request.url);
    if (request.method === 'post' || request.method === 'put') {
      // console.log('Request Data', request.data);
    }
    return request;
  });

  axiosClient.interceptors.response.use((response) => {
    // If not ok, throw an error
    if (response.status !== 200) {
      console.error('Response Error', response.data, response.status, response.statusText);
      throw new Error(response.statusText);
    }

    return response;
  });

  return axiosClient;
};

export type RateLimitedAxiosClient = ReturnType<typeof getAxiosClient>;
