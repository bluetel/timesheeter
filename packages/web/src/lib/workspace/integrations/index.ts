import { z } from 'zod';
import { type IconType } from 'react-icons';
import { LinkIcon } from '@heroicons/react/24/outline';
import { GoogleSheetsIntegration } from './google-sheets';
import { TogglIntegration } from './toggl';
import { JiraIntegration } from './jira';

export const INTEGRATIONS_HELP_TEXT = 'Integrations allow you to sync data to and from other external sources';

export const IntegrationIcon = LinkIcon as IconType;

export const INTEGRATION_DEFINITIONS = {
  TogglIntegration,
  JiraIntegration,
  GoogleSheetsIntegration,
} as const;

export type IntegrationType = keyof typeof INTEGRATION_DEFINITIONS;

export type IntegrationDetail = (typeof INTEGRATION_DEFINITIONS)[IntegrationType];

export const integrationConfigSchema = z.union([
  INTEGRATION_DEFINITIONS.TogglIntegration.configSchema,
  INTEGRATION_DEFINITIONS.JiraIntegration.configSchema,
  INTEGRATION_DEFINITIONS.GoogleSheetsIntegration.configSchema,
]);

export type IntegrationConfig = z.infer<typeof integrationConfigSchema>;

export const updateIntegrationConfigSchema = z.union([
  INTEGRATION_DEFINITIONS.TogglIntegration.updateIntegrationSchema,
  INTEGRATION_DEFINITIONS.JiraIntegration.updateIntegrationSchema,
  INTEGRATION_DEFINITIONS.GoogleSheetsIntegration.updateIntegrationSchema,
]);

export type UpdateIntegrationConfig = z.infer<typeof updateIntegrationConfigSchema>;

export const getDefaultIntegrationConfig = (type: IntegrationType = 'TogglIntegration') =>
  INTEGRATION_DEFINITIONS[type].defaultConfig;

export const createIntegrationSchema = z.object({
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100),
  config: integrationConfigSchema,
});

export const updateIntegrationSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100).optional(),
  config: updateIntegrationConfigSchema,
});

export * from './toggl';
