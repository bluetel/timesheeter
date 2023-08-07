import { env } from '../env';

const devPrefxes = ['https://staging.', 'https://dev.', 'http://localhost', 'http://0.0.0.0'];

export const devToolsEnabled = () => {
  if (devPrefxes.some((prefix) => env.NEXT_PUBLIC_URL.startsWith(prefix))) {
    return true;
  }

  return false;
};
