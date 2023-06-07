import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@timesheeter/app/server/api/trpc";
import {
  createIntegrationSchema,
  INTEGRATION_DEFINITIONS,
  updateIntegrationSchema,
  type IntegrationConfig,
} from "@timesheeter/app/lib/workspace/integrations";
import { decrypt, encrypt, filterConfig } from "@timesheeter/app/server/lib/secret-helpers";
import { type Integration, type PrismaClient } from "@prisma/client";

export const integrationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

      return ctx.prisma.integration
        .findMany({
          where: {
            workspaceId: input.workspaceId,
          },
        })
        .then((integrations) =>
          integrations.map((integration) => parseIntegration(integration))
        );
    }),
  create: protectedProcedure
    .input(createIntegrationSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

      const { config, ...rest } = input;

      return ctx.prisma.integration
        .create({
          data: {
            ...rest,
            type: config.type,
            configSerialized: encrypt(JSON.stringify(input.config)),
          },
        })
        .then(parseIntegration);
    }),
  update: protectedProcedure
    .input(updateIntegrationSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(
        ctx.prisma,
        input.id,
        input.workspaceId,
        ctx.session.user.id
      );

      const { config, ...rest } = input;

      return ctx.prisma.integration
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
            type: config?.type,
            configSerialized: config
              ? encrypt(JSON.stringify(input.config))
              : undefined,
          },
        })
        .then(parseIntegration);
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

      return ctx.prisma.integration
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseIntegration);
    }),
});

export type ParsedIntegration = Omit<Integration, "configSerialized"> & {
  config: IntegrationConfig;
};

export const parseIntegration = (
  integration: Integration,
  safe = true
): ParsedIntegration => {
  const config = JSON.parse(
    decrypt(integration.configSerialized)
  ) as IntegrationConfig;

  return {
    ...integration,
    config: safe
      ? filterConfig<IntegrationConfig>(
          config,
          INTEGRATION_DEFINITIONS[config.type].fields,
          config.type
        )
      : config,
  };
};

const authorize = async (
  prisma: PrismaClient,
  integrationId: string | null,
  workspaceId: string,
  userId: string
) => {
  const membership = await prisma.membership.findMany({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this workspace",
    });
  }

  if (!integrationId) {
    return;
  }

  const integration = await prisma.integration.findUnique({
    where: {
      id: integrationId,
    },
  });

  if (!integration) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Integration not found",
    });
  }

  if (integration.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Integration not found",
    });
  }
};
