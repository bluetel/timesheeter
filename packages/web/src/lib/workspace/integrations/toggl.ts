import { z } from 'zod';
import { SiToggl } from 'react-icons/si';
import { chronRegex } from '@timesheeter/web/lib/regex';

const defaultScanPeriod = 90;
const maxScanPeriod = 90;

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
      accessor: 'togglWorkspaceId',
      name: 'Toggl Workspace ID',
      type: 'string',
      required: false,
      protectCount: 0,
      description: 'Toggl Workspace ID to sync data with, leave blank to sync with the default workspace',
    },
    {
      accessor: 'chronExpression',
      name: 'Chron Expression',
      type: 'string',
      required: true,
      protectCount: 0,
      description: 'Chron Expression for when to pull data from Toggl',
    },
    {
      accessor: 'scanPeriod',
      name: 'Scan Period',
      type: 'string',
      required: true,
      protectCount: 0,
      description: `How far back to scan for time entries and sync them, the max is ${maxScanPeriod} days`,
    },
  ],
  configSchema: z.object({
    type: z.literal('TogglIntegration'),
    apiKey: z.string().min(1),
    togglWorkspaceId: z
      .any()
      .transform((value) => (!value ? null : parseInt(String(value), 10)))
      .pipe(z.number().int().positive().nullable()),
    chronExpression: z.string().regex(chronRegex),
    scanPeriod: z
      .any()
      .transform((val) => (val === '' ? defaultScanPeriod : parseInt(String(val), 10)))
      .pipe(z.number().int().positive().max(maxScanPeriod)),
  }),
  updateIntegrationSchema: z.object({
    type: z.literal('TogglIntegration'),
    apiKey: z.string().min(1).optional(),
    togglWorkspaceId: z
      .any()
      .transform((value) => (value === undefined ? undefined : !!value ? parseInt(String(value), 10) : null))
      .pipe(z.number().int().positive().nullable().optional()),
    chronExpression: z.string().regex(chronRegex).optional(),
    scanPeriod: z
      .any()
      .transform((value) =>
        value === undefined ? undefined : !!value ? parseInt(String(value), 10) : defaultScanPeriod
      )
      .pipe(z.number().int().positive().max(maxScanPeriod).optional()),
  }),
  defaultConfig: {
    type: 'TogglIntegration',
    apiKey: '',
    togglWorkspaceId: null,
    // Default to every 15 minutes
    chronExpression: '*/15 * * * *',
    scanPeriod: defaultScanPeriod,
  },
} as const;
