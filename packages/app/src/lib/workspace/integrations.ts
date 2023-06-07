import { z } from "zod";
import { SiWikipedia, SiWordpress, SiZendesk } from "react-icons/si";

export const INTEGRATIONS_HELP_TEXT =
  "Integrations allow models to connect to public and private data sources.";

export const INTEGRATION_DEFINITIONS = {
  ZendeskReader: {
    name: "Zendesk",
    icon: SiZendesk,
    fields: [
      {
        accessor: "zendeskSubdomain",
        name: "Zendesk Subdomain",
        type: "string",
        required: true,
        protectCount: 0,
        description: "The subdomain of your Zendesk instance",
      },
      {
        accessor: "locale",
        name: "Locale",
        type: "string",
        required: false,
        protectCount: 0,
        description: "Specified language, defaults to en-us",
      },
    ],
    configSchema: z.object({
      type: z.literal("ZendeskReader"),
      zendeskSubdomain: z.string().url(),
      locale: z
        .string()
        .optional()
        .default("en-us")
        .describe("Specified language, defaults to en-us"),
    }),
    defaultConfig: {
      type: "ZendeskReader",
      zendeskSubdomain: "",
      locale: "en-us",
    },
  },
  WordpressReader: {
    name: "Wordpress",
    icon: SiWordpress,
    fields: [
      {
        accessor: "url",
        name: "URL",
        type: "string",
        required: true,
        protectCount: 0,
        description: "The URL of the Wordpress site",
      },
      {
        accessor: "username",
        name: "Username",
        type: "string",
        required: true,
        protectCount: 0,
        description: "The username of the Wordpress site",
      },
      {
        accessor: "password",
        name: "Password",
        type: "string",
        required: true,
        protectCount: -1,
        description: "The password of the Wordpress site",
      },
    ],
    configSchema: z.object({
      type: z.literal("WordpressReader"),
      url: z.string(),
      username: z.string().min(1),
      password: z.string().min(1),
    }),
    defaultConfig: {
      type: "WordpressReader",
      url: "",
      username: "",
      password: "",
    },
  },
  WikipediaReader: {
    name: "Wikipedia",
    icon: SiWikipedia,
    fields: [
      {
        accessor: "pages",
        name: "Pages",
        type: "string",
        required: true,
        protectCount: 0,
        description:
          "The pages to fetch, seperated by commas eg 'Berlin,Paris,New York'",
      },
    ],
    configSchema: z.object({
      type: z.literal("WikipediaReader"),
      pages: z
        .string()
        .min(0)
        .describe(
          "The pages to fetch, seperated by commas eg 'Berlin,Paris,New York'"
        ),
    }),
    defaultConfig: {
      type: "WikipediaReader",
      pages: "",
    },
  },
} as const;

export type IntegrationVariant = keyof typeof INTEGRATION_DEFINITIONS;

export type IntegrationDetail =
  (typeof INTEGRATION_DEFINITIONS)[IntegrationVariant];

export const integrationConfigSchema = z.union([
  INTEGRATION_DEFINITIONS.ZendeskReader.configSchema,
  INTEGRATION_DEFINITIONS.WordpressReader.configSchema,
  INTEGRATION_DEFINITIONS.WikipediaReader.configSchema,
]);

export type IntegrationConfig = z.infer<typeof integrationConfigSchema>;

export const getDefaultConfig = (type: IntegrationVariant = "ZendeskReader") =>
  INTEGRATION_DEFINITIONS[type].defaultConfig;

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
  config: integrationConfigSchema.optional(),
});
