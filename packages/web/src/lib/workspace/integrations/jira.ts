import { z } from 'zod';
import { SiJira } from 'react-icons/si';
import { chronRegex, hostnameRegex } from '@timesheeter/web/lib/regex';

export const JiraIntegration = {
  name: 'Jira',
  description: 'Connects to Jira to pull in task details',
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
  ],
  configSchema: z.object({
    type: z.literal('JiraIntegration'),
    apiKey: z.string().min(1),
    username: z.string().min(1),
    host: z.string().regex(hostnameRegex, 'Please enter a valid hostname'),
    chronExpression: z.string().regex(chronRegex),
  }),
  updateIntegrationSchema: z.object({
    type: z.literal('JiraIntegration'),
    apiKey: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    host: z.string().regex(hostnameRegex, 'Please enter a valid hostname').optional(),
    chronExpression: z.string().regex(chronRegex).optional(),
  }),
  defaultConfig: {
    type: 'JiraIntegration',
    apiKey: '',
    username: '',
    host: '',
    // Default to every 15 minutes
    chronExpression: '*/15 * * * *',
  },
} as const;