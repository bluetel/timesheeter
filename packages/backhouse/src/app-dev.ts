import { config } from 'dotenv';

console.log('Starting Dev Backhouse Worker');

if (process.env.NODE_ENV !== 'production') {
  config({ path: '../../.env.local' });
}

import { handleIntegrationsJob } from './integrations';
import { determineExecution } from './determine-execution';

const determineDevExecution = () => {
  determineExecution()
    .then((integrationJobs) => Promise.all(integrationJobs.map(handleIntegrationsJob)))
    .catch((error) => {
      console.error('Error in determineDevExecution', error);
    });
};

(async () => {
  setInterval(() => {
    const secondsNow = new Date().getSeconds();
    if (secondsNow === 0) {
      determineDevExecution();
    }
  }, 1000);

  console.log('Dev backhouse runner running, waiting for integrations to run...');
})().catch((error) => {
  throw error;
});
