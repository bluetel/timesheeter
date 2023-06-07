import { SiGoogle, SiWolfram } from "react-icons/si";
import { z } from "zod";

export const TOOLS_HELP_TEXT =
  "Tools allow your tools to connect to external services and interract with the world.";

export const TOOL_DEFINITIONS = {
  GoogleSerper: {
    name: "Google Search",
    icon: SiGoogle,
    fields: [],
    configSchema: z.object({
      type: z.literal("GoogleSerper"),
    }),
    defaultConfig: {
      type: "GoogleSerper",
    },
  },
  WolframAlpha: {
    name: "Wolfram Alpha",
    icon: SiWolfram,
    fields: [
      {
        accessor: "appId",
        name: "App ID",
        type: "string",
        required: true,
        protectCount: -1,
        description: "The App ID of your Wolfram Alpha account",
      },
    ],
    configSchema: z.object({
      type: z.literal("WolframAlpha"),
      appId: z.string(),
    }),
    defaultConfig: {
      type: "WolframAlpha",
      appId: "",
    },
  },
} as const;

export type ToolVariant = keyof typeof TOOL_DEFINITIONS;

export const toolConfigSchema = z.union([
  TOOL_DEFINITIONS.GoogleSerper.configSchema,
  TOOL_DEFINITIONS.WolframAlpha.configSchema,
]);

export type ToolConfig = z.infer<typeof toolConfigSchema>;

export const getDefaultConfig = (type: ToolVariant = "GoogleSerper") =>
  TOOL_DEFINITIONS[type].defaultConfig;

export const createToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(0).max(1000),
  config: toolConfigSchema,
  workspaceId: z.string(),
});

export type CreateToolInput = z.infer<typeof createToolSchema>;

export const updateToolSchema = createToolSchema.extend({
  id: z.string().cuid2(),
});

export type UpdateToolInput = z.infer<typeof updateToolSchema>;
