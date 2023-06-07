import {
  type Integration,
  type Model,
  type Tool,
  type PrismaClient,
  type Connector,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createModelSchema, updateModelSchema } from "@timesheeter/app/lib/workspace/models";
import { createTRPCRouter, protectedProcedure } from "@timesheeter/app/server/api/trpc";
import { parseIntegration } from "./integrations";
import { parseTool } from "./tools";
import { type MemoryVariant } from "@timesheeter/app/lib/workspace/memory";
import { parseConnector } from "./connectors";

export const modelsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

      return ctx.prisma.model
        .findMany({
          where: {
            workspaceId: input.workspaceId,
          },
          include: {
            integrations: true,
            tools: true,
            connectors: true,
          },
        })
        .then((models) => models.map(parseModel));
    }),
  create: protectedProcedure
    .input(createModelSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

      // Ensure that the integrations are valid and belong to the workspace
      if (input.integrations.length > 0) {
        await authorizeIntegrationConnections(
          ctx.prisma,
          input.integrations,
          input.workspaceId
        );
      }

      if (input.tools.length > 0) {
        await authorizeToolConnections(
          ctx.prisma,
          input.tools,
          input.workspaceId
        );
      }

      const { memoryVariant, ...rest } = input;

      return ctx.prisma.model
        .create({
          data: {
            ...rest,
            integrations: {
              connect: input.integrations.map((integration) => ({
                id: integration.id,
              })),
            },
            tools: {
              connect: input.tools.map((tool) => ({
                id: tool.id,
              })),
            },
            // TODO: Add default connector
            connectors: {
              connect: [],
            },
            memoryVariantConfigSerialized: JSON.stringify(memoryVariant),
          },
          include: {
            integrations: true,
            tools: true,
            connectors: true,
          },
        })
        .then(parseModel);
    }),
  update: protectedProcedure
    .input(updateModelSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(
        ctx.prisma,
        input.id,
        input.workspaceId,
        ctx.session.user.id
      );

      // If connecting data, ensure that the data is valid and belongs to the workspace
      if (input.integrations) {
        await authorizeIntegrationConnections(
          ctx.prisma,
          input.integrations,
          input.workspaceId
        );
      }

      if (input.tools) {
        await authorizeToolConnections(
          ctx.prisma,
          input.tools,
          input.workspaceId
        );
      }

      const { memoryVariant, ...rest } = input;

      return ctx.prisma.model
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
            integrations: input.integrations
              ? {
                  set: input.integrations.map((integration) => ({
                    id: integration.id,
                  })),
                }
              : undefined,
            tools: input.tools
              ? {
                  set: input.tools.map((tool) => ({
                    id: tool.id,
                  })),
                }
              : undefined,
            connectors: input.connectors
              ? {
                  set: input.connectors.map((connector) => ({
                    id: connector.id,
                  })),
                }
              : undefined,
            memoryVariantConfigSerialized: JSON.stringify(memoryVariant),
          },
        })
        .then(parseModelNoConnections);
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

      return ctx.prisma.model
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseModelNoConnections);
    }),
});

const authorize = async (
  prisma: PrismaClient,
  modelId: string | null,
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

  if (modelId === null) {
    return;
  }

  const model = await prisma.model.findUnique({
    where: {
      id: modelId,
    },
  });

  if (!model) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Model not found",
    });
  }

  if (model.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid workspace",
    });
  }
};

const authorizeIntegrationConnections = async (
  prisma: PrismaClient,
  requestedIntegrations: { id: string }[],
  workspaceId: string
) => {
  const integrations = await prisma.integration.findMany({
    where: {
      id: {
        in: requestedIntegrations.map((integration) => integration.id),
      },
      workspaceId,
    },
  });

  if (integrations.length !== requestedIntegrations.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid integrations",
    });
  }
};

const authorizeToolConnections = async (
  prisma: PrismaClient,
  requestedTools: { id: string }[],
  workspaceId: string
) => {
  const tools = await prisma.tool.findMany({
    where: {
      id: {
        in: requestedTools.map((tool) => tool.id),
      },
      workspaceId,
    },
  });

  if (tools.length !== requestedTools.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid tools",
    });
  }
};

const parseModel = (
  model: Model & {
    integrations?: Integration[];
    tools?: Tool[];
    connectors?: Connector[];
  }
) => {
  const {
    memoryVariantConfigSerialized,
    integrations,
    tools,
    connectors,
    ...rest
  } = model;

  return {
    ...rest,
    memoryVariant: JSON.parse(memoryVariantConfigSerialized) as MemoryVariant,
    integrations: (integrations ?? []).map((integration) =>
      parseIntegration(integration)
    ),
    tools: (tools ?? []).map((tool) => parseTool(tool)),
    connectors: (connectors ?? []).map((connector) =>
      parseConnector(connector)
    ),
  };
};

const parseModelNoConnections = (model: Model) => {
  const { memoryVariantConfigSerialized, ...rest } = model;

  return {
    ...rest,
    memoryVariant: JSON.parse(memoryVariantConfigSerialized) as MemoryVariant,
  };
};
