import { z } from "zod";
import { memoryVariantSchema } from "./memory";

export const MODELS_HELP_TEXT =
  "Models can be configured for different use cases and use a variety of tools and integrations.";

export const createModelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(0).max(1000),
  workspaceId: z.string(),
  integrations: z.array(z.object({ id: z.string() })).default([]),
  tools: z.array(z.object({ id: z.string() })).default([]),
  connectors: z.array(z.object({ id: z.string() })).default([]),
  memoryVariant: memoryVariantSchema,
});

export const updateModelSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(0).max(1000).optional(),
  integrations: z
    .array(z.object({ id: z.string() }))
    .default([])
    .optional(),
  tools: z
    .array(z.object({ id: z.string() }))
    .default([])
    .optional(),
  connectors: z
    .array(z.object({ id: z.string() }))
    .default([])
    .optional(),
  memoryVariant: memoryVariantSchema.optional(),
});
