import { z } from "zod";
import { TbPlugConnected } from "react-icons/tb";
import { CgWebsite } from "react-icons/cg";

export const CONNECTORS_HELP_TEXT =
  "Connectors provide access to your model through your favourite tools and services";

export const CONNECTOR_DEFINITIONS = {
  WebSocket: {
    name: "WebSocket",
    description: "Connect to your model via a websocket",
    icon: TbPlugConnected,
    fields: [
      {
        accessor: "publicAccess",
        name: "Public Access",
        type: "boolean",
        required: true,
        protectCount: 0,
        description:
          "Allow public access to this model, else api key is required",
      },
    ],
    configSchema: z.object({
      type: z.literal("WebSocket"),
      publicAccess: z
        .boolean()
        .default(false)
        .describe(
          "Allow public access to this model, else api key is required"
        ),
    }),
    defaultConfig: {
      type: "WebSocket",
    },
  },
  WebPlaygroundPublic: {
    name: "Web Playground (Public)",
    description: "Web playground that anyone can access",
    icon: CgWebsite,
    fields: [],
    configSchema: z.object({
      type: z.literal("WebPlaygroundPublic"),
      publicAccess: z.boolean().default(false),
    }),
    defaultConfig: {
      type: "WebPlaygroundPublic",
    },
  },
  WebPlaygroundPrivate: {
    name: "Web Playground (Password Protected)",
    description: "Password protected web playground",
    icon: CgWebsite,
    fields: [
      {
        accessor: "password",
        name: "Password",
        type: "string",
        required: true,
        protectCount: -1,
        description: "Password to access the playground",
      },
    ],
    configSchema: z.object({
      type: z.literal("WebPlaygroundPrivate"),
      password: z.string().min(7).max(100),
    }),
    defaultConfig: {
      type: "WebPlaygroundPrivate",
      password: "",
    },
  },
} as const;

export type ConnectorVariant = keyof typeof CONNECTOR_DEFINITIONS;

export type ConnectorDetail = (typeof CONNECTOR_DEFINITIONS)[ConnectorVariant];

export const connectorConfigSchema = z.union([
  CONNECTOR_DEFINITIONS.WebSocket.configSchema,
  CONNECTOR_DEFINITIONS.WebPlaygroundPrivate.configSchema,
  CONNECTOR_DEFINITIONS.WebPlaygroundPublic.configSchema,
]);

export type ConnectorConfig = z.infer<typeof connectorConfigSchema>;

export const getDefaultConfig = (type: ConnectorVariant = "WebSocket") =>
  CONNECTOR_DEFINITIONS[type].defaultConfig;

export const createConnectorSchema = z.object({
  workspaceId: z.string().cuid2(),
  modelId: z.string().cuid2(),
  name: z.string().min(1).max(100),
  config: connectorConfigSchema,
});

export const updateConnectorSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100).optional(),
  config: connectorConfigSchema.optional(),
});
