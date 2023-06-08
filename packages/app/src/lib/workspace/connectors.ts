import { z } from "zod";
import { SiJira } from "react-icons/si";
import { chronRegex } from "@timesheeter/app/lib/regex";

export const CONNECTORS_HELP_TEXT =
  "Connectors provide additional detail to your tickets, such as adding from Jira";

export const CONNECTOR_DEFINITIONS = {
  JiraConnector: {
    name: "Jira",
    description: "Connect to Jira to pull in ticket details",
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
        description: "Your Jira Host (e.g. https://mycompany.atlassian.net)",
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
          "Retroactively check for updates to tickets in the last X days e.g. for a change in description",
      },
    ],
    configSchema: z.object({
      type: z.literal("JiraConnector"),
      apiKey: z.string().min(1),
      username: z.string().min(1),
      host: z.string().url(),
      chronExpression: z.string().regex(chronRegex),
      checkForUpdatesDays: z.number().int().positive().default(7),
    }),
    updateConnectorSchema: z.object({
      type: z.literal("JiraConnector"),
      apiKey: z.string().min(1).optional(),
      username: z.string().min(1).optional(),
      host: z.string().url().optional(),
      chronExpression: z.string().regex(chronRegex).optional(),
      checkForUpdatesDays: z.number().int().positive().default(7),
    }),
    defaultConfig: {
      type: "JiraConnector",
      apiKey: "",
      username: "",
      host: "",
      // Default to every 15 minutes
      chronExpression: "*/15 * * * *",
      checkForUpdatesDays: 7,
    },
  },
} as const;

export type ConnectorVariant = keyof typeof CONNECTOR_DEFINITIONS;

export type ConnectorDetail = (typeof CONNECTOR_DEFINITIONS)[ConnectorVariant];

// export const connectorConfigSchema = z.union([
//   CONNECTOR_DEFINITIONS.TogglConnector.configSchema,
// ]);

export const connectorConfigSchema =
  CONNECTOR_DEFINITIONS.JiraConnector.configSchema;

export type ConnectorConfig = z.infer<typeof connectorConfigSchema>;

export const updateConnectorConfigSchema =
  CONNECTOR_DEFINITIONS.JiraConnector.updateConnectorSchema;

export type UpdateConnectorConfig = z.infer<typeof updateConnectorConfigSchema>;

export const getDefaultConfig = (type: ConnectorVariant = "JiraConnector") =>
  CONNECTOR_DEFINITIONS[type].defaultConfig;

export const createConnectorSchema = z.object({
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100),
  description: z.string().min(0).max(500),
  config: connectorConfigSchema,
});

export const updateConnectorSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(0).max(500).optional(),
  config: updateConnectorConfigSchema,
});
