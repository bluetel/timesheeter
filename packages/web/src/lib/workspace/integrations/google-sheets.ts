import { z } from 'zod';
import { SiGooglesheets } from 'react-icons/si';
import { chronRegex } from '@timesheeter/web/lib/regex';

export const timesheetSchema = z.object({
  sheetId: z.string().min(1),
  userId: z.string().min(1),
});

export type Timesheet = z.infer<typeof timesheetSchema>;

export const timesheetDescription = 'Specific user Google Sheets timesheets to output to';

export const GoogleSheetsIntegration = {
  name: 'Google Sheets',
  description: 'Outputs user timesheet data to multiple Google Sheets timesheets',
  icon: SiGooglesheets,
  fields: [
    // {
    //   accessor: 'sheetId',
    //   name: 'Sheet ID',
    //   type: 'string',
    //   required: true,
    //   protectCount: 0,
    //   description: 'Your Google Sheet ID, found in the URL',
    // },
    {
      accessor: 'serviceAccountEmail',
      name: 'Service Account Email',
      type: 'string',
      required: true,
      protectCount: 0,
      description: 'Your Google Service Account Email, make sure to invite it to all your sheet',
    },
    {
      accessor: 'privateKey',
      name: 'Private Key',
      type: 'string',
      required: true,
      protectCount: -1,
      description: `Your Google Service Account Private Key, include "-----BEGIN PRIVATE KEY-----" and newline breakpoints`,
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
      accessor: 'commitDelayDays',
      name: 'Commit Delay Days',
      type: 'number',
      required: true,
      protectCount: 0,
      description:
        'How many days to wait before committing data to the sheet. This is to allow changes to data to be made before committing',
    },
    {
      accessor: 'timesheets',
      name: 'Timesheets',
      type: 'hidden',
      required: true,
      protectCount: 0,
      description: timesheetDescription,
    },
  ],
  configSchema: z.object({
    type: z.literal('GoogleSheetsIntegration'),
    serviceAccountEmail: z.string().email(),
    privateKey: z.string().min(1),
    chronExpression: z.string().regex(chronRegex),
    commitDelayDays: z.number().int().positive().default(2),
    timesheets: z.array(timesheetSchema).default([]),
  }),
  updateIntegrationSchema: z.object({
    type: z.literal('GoogleSheetsIntegration'),
    serviceAccountEmail: z.string().email().optional(),
    privateKey: z.string().min(1).optional(),
    chronExpression: z.string().regex(chronRegex).optional(),
    commitDelayDays: z.number().int().positive().default(2).optional(),
    timesheets: z.array(timesheetSchema).optional(),
  }),
  defaultConfig: {
    type: 'GoogleSheetsIntegration',
    serviceAccountEmail: '',
    privateKey: '',
    // Default to every midnight
    chronExpression: '0 0 * * *',
    commitDelayDays: 2,
    timesheets: [] as z.infer<typeof timesheetSchema>[],
  },
} as const;
