import { z } from "zod";
import { SiToggl } from "react-icons/si";
import { chronRegex } from "@timesheeter/app/lib/regex";

export const INTEGRATIONS_HELP_TEXT =
  "Integrations allow you to pull data from external timesheet providers into your workspace";

export const INTEGRATION_DEFINITIONS = {
  TogglIntegration: {
    name: "Toggl",
    description: "Connect to Toggl to pull in time entries",
    icon: SiToggl,
    fields: [
      {
        accessor: "apiKey",
        name: "API Key",
        type: "string",
        required: true,
        protectCount: 4,
        description: "Your Toggl API key",
      },
      {
        accessor: "chronExpression",
        name: "Chron Expression",
        type: "string",
        required: true,
        protectCount: 0,
        description: "Chron Expression for when to pull data from Toggl",
      },
    ],
    configSchema: z.object({
      type: z.literal("TogglIntegration"),
      apiKey: z.string().min(1),
      chronExpression: z.string().regex(chronRegex),
    }),
    updateIntegrationSchema: z.object({
      type: z.literal("TogglIntegration"),
      apiKey: z.string().min(1).optional(),
      chronExpression: z.string().regex(chronRegex).optional(),
    }),
    defaultConfig: {
      type: "TogglIntegration",
      apiKey: "",
      // Default to every 15 minutes
      chronExpression: "*/15 * * * *",
    },
  },
} as const;

export type IntegrationVariant = keyof typeof INTEGRATION_DEFINITIONS;

export type IntegrationDetail =
  (typeof INTEGRATION_DEFINITIONS)[IntegrationVariant];

// export const integrationConfigSchema = z.union([
//   INTEGRATION_DEFINITIONS.TogglIntegration.configSchema,
// ]);

export const integrationConfigSchema =
  INTEGRATION_DEFINITIONS.TogglIntegration.configSchema;

export type IntegrationConfig = z.infer<typeof integrationConfigSchema>;

export const updateIntegrationConfigSchema =
  INTEGRATION_DEFINITIONS.TogglIntegration.updateIntegrationSchema;

export type UpdateIntegrationConfig = z.infer<
  typeof updateIntegrationConfigSchema
>;

export const getDefaultConfig = (
  type: IntegrationVariant = "TogglIntegration"
) => INTEGRATION_DEFINITIONS[type].defaultConfig;

export const createIntegrationSchema = z.object({
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100),
  description: z.string().min(0).max(500),
  config: integrationConfigSchema,
});

export const updateIntegrationSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(0).max(500).optional(),
  config: updateIntegrationConfigSchema,
});
