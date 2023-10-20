import { z } from 'zod';
import { SiJira } from 'react-icons/si';
import { chronRegex, hostnameRegex } from '@timesheeter/web/lib/regex';

export const jiraTaskPrefixesDescriptionV2 = 'Task prefixes to search for in Jira';

export const JiraIntegrationV2 = {
  name: 'Jira (V2)',
  description:
    'Connects to Jira to pull in task details, if private, will only scan for tasks you have timesheet entries for',
  icon: SiJira,
  fields: [
    {
      accessor: 'apiKey',
      name: 'Jira API Key',
      type: 'string',
      required: true,
      protectCount: 4,
      description: 'Your Jira API Key',
    },
    {
      accessor: 'username',
      name: 'Jira Username',
      type: 'string',
      required: true,
      protectCount: 0,
      description: 'Your Jira Username (owner of the API Key)',
    },
    {
      accessor: 'host',
      name: 'Jira Host',
      type: 'string',
      required: true,
      protectCount: 0,
      description: 'Your Jira Host (e.g. mycompany.atlassian.net)',
    },
    {
      accessor: 'chronExpression',
      name: 'Chron Expression',
      type: 'string',
      required: true,
      protectCount: 0,
      description: 'Chron Expression for when to pull data from Jira',
    },
    {
      accessor: 'taskPrefixIds',
      name: 'Task Prefixes',
      type: 'hidden',
      required: true,
      protectCount: 0,
      description: jiraTaskPrefixesDescriptionV2,
    },
  ],
  configSchema: z.object({
    type: z.literal('JiraIntegrationV2'),
    apiKey: z.string().min(1),
    username: z.string().min(1),
    host: z.string().regex(hostnameRegex, 'Please enter a valid hostname'),
    chronExpression: z.string().regex(chronRegex),
    taskPrefixIds: z.array(z.string().cuid2()).default([]),
  }),
  updateIntegrationSchema: z.object({
    type: z.literal('JiraIntegrationV2'),
    apiKey: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    host: z.string().regex(hostnameRegex, 'Please enter a valid hostname').optional(),
    chronExpression: z.string().regex(chronRegex).optional(),
    taskPrefixIds: z.array(z.string().cuid2()).default([]).optional(),
  }),
  defaultConfig: {
    type: 'JiraIntegrationV2',
    apiKey: '',
    username: '',
    host: '',
    // Default to every 15 minutes
    chronExpression: '*/15 * * * *',
    taskPrefixIds: [] as string[],
  },
} as const;
