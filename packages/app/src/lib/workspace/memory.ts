import { z } from "zod";

export const MEMORY_TYPE = ["Disabled", "Buffer", "BufferWindow"] as const;

export const memoryVariantSchema = z
  .union([
    z.object({
      type: z.literal("Disabled"),
    }),
    z.object({
      type: z.literal("Buffer"),
    }),
    z.object({
      type: z.literal("BufferWindow"),
      k: z.number().int().positive().min(1),
    }),
  ])
  .default({ type: "Disabled" });

export type MemoryVariant = z.infer<typeof memoryVariantSchema>;
