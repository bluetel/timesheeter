import { type Tool, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createToolSchema,
  type ToolConfig,
  TOOL_DEFINITIONS,
  updateToolSchema,
} from "@timesheeter/app/lib/workspace/tools";
import { createTRPCRouter, protectedProcedure } from "@timesheeter/app/server/api/trpc";
import { decrypt, encrypt, filterConfig } from "@timesheeter/app/server/lib/secret-helpers";

export const toolsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

      return ctx.prisma.tool
        .findMany({
          where: {
            workspaceId: input.workspaceId,
          },
        })
        .then((tools) => tools.map((tool) => parseTool(tool)));
    }),
  create: protectedProcedure
    .input(createToolSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

      const { config, ...rest } = input;

      return ctx.prisma.tool
        .create({
          data: {
            ...rest,
            type: config.type,
            configSerialized: encrypt(JSON.stringify(config)),
          },
        })
        .then(parseTool);
    }),
  update: protectedProcedure
    .input(updateToolSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(
        ctx.prisma,
        input.id,
        input.workspaceId,
        ctx.session.user.id
      );

      const { config, ...rest } = input;

      return ctx.prisma.tool
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
            type: config.type,
            configSerialized: encrypt(JSON.stringify(config)),
          },
        })
        .then(parseTool);
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await authorize(
        ctx.prisma,
        input.id,
        input.workspaceId,
        ctx.session.user.id
      );

      return ctx.prisma.tool
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseTool);
    }),
});

export type ParsedTool = Omit<Tool, "configSerialized"> & {
  config: ToolConfig;
};

export const parseTool = (tool: Tool, safe = true): ParsedTool => {
  const config = JSON.parse(decrypt(tool.configSerialized)) as ToolConfig;

  return {
    ...tool,
    config: safe
      ? filterConfig<ToolConfig>(
          config,
          TOOL_DEFINITIONS[config.type].fields,
          config.type
        )
      : config,
  };
};

const authorize = async (
  prisma: PrismaClient,
  toolId: string | null,
  workspaceId: string,
  userId: string
) => {
  const membership = await prisma.membership.findMany({
    where: {
      userId: userId,
      workspaceId: workspaceId,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this workspace",
    });
  }

  if (toolId === null) {
    return;
  }

  const tool = await prisma.tool.findUnique({
    where: {
      id: toolId,
    },
  });

  if (!tool) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Model not found",
    });
  }

  if (tool.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid workspace",
    });
  }
};
