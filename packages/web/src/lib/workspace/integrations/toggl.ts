import { z } from 'zod';
import { SiToggl } from 'react-icons/si';
import { chronRegex } from '@timesheeter/web/lib/regex';

export const TogglIntegration = {
  name: 'Toggl',
  description: 'Connects to Toggl to pull in time entries',
  icon: SiToggl,
  fields: [
    {
      accessor: 'apiKey',
      name: 'API Key',
      type: 'string',
      required: true,
      protectCount: 4,
      description: 'Your Toggl API key',
    },
    {
      accessor: 'chronExpression',
      name: 'Chron Expression',
      type: 'string',
      required: true,
      protectCount: 0,
      description: 'Chron Expression for when to pull data from Toggl',
    },
  ],
  configSchema: z.object({
    type: z.literal('TogglIntegration'),
    apiKey: z.string().min(1),
    chronExpression: z.string().regex(chronRegex),
  }),
  updateIntegrationSchema: z.object({
    type: z.literal('TogglIntegration'),
    apiKey: z.string().min(1).optional(),
    chronExpression: z.string().regex(chronRegex).optional(),
  }),
  defaultConfig: {
    type: 'TogglIntegration',
    apiKey: '',
    // Default to every 15 minutes
    chronExpression: '*/15 * * * *',
  },
} as const;
