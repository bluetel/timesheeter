import { z } from "zod";
import { SiGooglesheets, SiJira, SiToggl } from "react-icons/si";
import { chronRegex, hostnameRegex } from "@timesheeter/app/lib/regex";
import { type IconType } from "react-icons";
import { LinkIcon } from "@heroicons/react/24/outline";

export const INTEGRATIONS_HELP_TEXT =
  "Integrations allow you to pull data from external timesheet providers into your workspace" as const;

export const IntegrationIcon = LinkIcon as IconType;

export const INTEGRATION_DEFINITIONS = {
  TogglIntegration: {
    name: "Toggl",
    description: "Connects to Toggl to pull in time entries",
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
  JiraIntegration: {
    name: "Jira",
    description: "Connects to Jira to pull in task details",
    icon: SiJira,
    fields: [
      {
        accessor: "apiKey",
        name: "Jira API Key",
        type: "string",
        required: true,
        protectCount: 4,
        description: "Your Jira API Key",
      },
      {
        accessor: "username",
        name: "Jira Username",
        type: "string",
        required: true,
        protectCount: 0,
        description: "Your Jira Username (owner of the API Key)",
      },
      {
        accessor: "host",
        name: "Jira Host",
        type: "string",
        required: true,
        protectCount: 0,
        description: "Your Jira Host (e.g. mycompany.atlassian.net)",
      },
      {
        accessor: "chronExpression",
        name: "Chron Expression",
        type: "string",
        required: true,
        protectCount: 0,
        description: "Chron Expression for when to pull data from Jira",
      },
      {
        accessor: "checkForUpdatesDays",
        name: "Check for Updates Days",
        type: "number",
        required: true,
        protectCount: 0,
        description:
          "Retroactively check for updates to tasks in the last X days e.g. for a change in name",
      },
    ],
    configSchema: z.object({
      type: z.literal("JiraIntegration"),
      apiKey: z.string().min(1),
      username: z.string().min(1),
      host: z.string().regex(hostnameRegex, "Please enter a valid hostname"),
      chronExpression: z.string().regex(chronRegex),
      checkForUpdatesDays: z.number().int().positive().default(7),
    }),
    updateIntegrationSchema: z.object({
      type: z.literal("JiraIntegration"),
      apiKey: z.string().min(1).optional(),
      username: z.string().min(1).optional(),
      host: z
        .string()
        .regex(hostnameRegex, "Please enter a valid hostname")
        .optional(),
      chronExpression: z.string().regex(chronRegex).optional(),
      checkForUpdatesDays: z.number().int().positive().default(7).optional(),
    }),
    defaultConfig: {
      type: "JiraIntegration",
      apiKey: "",
      username: "",
      host: "",
      // Default to every 15 minutes
      chronExpression: "*/15 * * * *",
      checkForUpdatesDays: 7,
    },
  },
  GoogleSheetsIntegration: {
    name: "Google Sheets",
    description: "Outputs your timesheet data to your Google Sheets timesheet",
    icon: SiGooglesheets,
    fields: [
      {
        accessor: "sheetId",
        name: "Sheet ID",
        type: "string",
        required: true,
        protectCount: 4,
        description: "Your Google Sheet ID, found in the URL",
      },
      {
        accessor: "serviceAccountEmail",
        name: "Service Account Email",
        type: "string",
        required: true,
        protectCount: 0,
        description:
          "Your Google Service Account Email, make sure to invite it to your sheet",
      },
      {
        accessor: "privateKey",
        name: "Private Key",
        type: "string",
        required: true,
        protectCount: 4,
        description: "Your Google Service Account Private Key",
      },
    ],
    configSchema: z.object({
      type: z.literal("GoogleSheetsIntegration"),
      sheetId: z.string().min(1),
      serviceAccountEmail: z.string().email(),
      privateKey: z.string().min(1),
    }),
    updateIntegrationSchema: z.object({
      type: z.literal("GoogleSheetsIntegration"),
      sheetId: z.string().min(1).optional(),
      serviceAccountEmail: z.string().email().optional(),
      privateKey: z.string().min(1).optional(),
    }),
    defaultConfig: {
      type: "GoogleSheetsIntegration",
      sheetId: "",
      serviceAccountEmail: "",
      privateKey: "",
    },
  },
} as const;

export type IntegrationType = keyof typeof INTEGRATION_DEFINITIONS;

export type IntegrationDetail =
  (typeof INTEGRATION_DEFINITIONS)[IntegrationType];

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

export type UpdateIntegrationConfig = z.infer<
  typeof updateIntegrationConfigSchema
>;

export const getDefaultIntegrationConfig = (
  type: IntegrationType = "TogglIntegration"
) => INTEGRATION_DEFINITIONS[type].defaultConfig;

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
