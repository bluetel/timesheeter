import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@timesheeter/web/server/api/trpc';
import {
  createIntegrationSchema,
  INTEGRATION_DEFINITIONS,
  updateIntegrationSchema,
  type IntegrationConfig,
  type UpdateIntegrationConfig,
  updateIntegrationConfigSchema,
} from '@timesheeter/web/lib/workspace/integrations';
import { decrypt, encrypt, filterConfig } from '@timesheeter/web/server/lib/secret-helpers';
import { type Integration, type PrismaClient } from '@prisma/client';
import { integrationsQueue } from '@timesheeter/web/server/bullmq';

export const integrationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        integrationId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.integration
        .findMany({
          where: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        })
        .then((integrations) => integrations.map((integration) => parseIntegration(integration)));
    }),
  create: protectedProcedure.input(createIntegrationSchema).mutation(async ({ ctx, input }) => {
    await authorize({
      prisma: ctx.prisma,
      integrationId: null,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config, ...rest } = input;

    const createdIntegration = await ctx.prisma.integration
      .create({
        data: {
          userId: ctx.session.user.id,
          ...rest,
          configSerialized: encrypt(JSON.stringify(config)),
        },
      })
      .then(parseIntegration);

    // Queue the integration for processing
    const { repeatJobKey } = await integrationsQueue.add(
      'processIntegration',
      {
        integrationId: createdIntegration.id,
      },
      {
        repeat: {
          pattern: config.chronExpression,
        },
        jobId: `integration-${createdIntegration.id}-jobId`,
        repeatJobKey: `integration-${createdIntegration.id}-repeatJobKey`,
      }
    );

    // Update the integration with the repeat job key
    return ctx.prisma.integration
      .update({
        where: {
          id: createdIntegration.id,
        },
        data: {
          repeatJobKey,
        },
      })
      .then(parseIntegration);
  }),
  update: protectedProcedure.input(updateIntegrationSchema).mutation(async ({ ctx, input }) => {
    const { config: oldConfig, repeatJobKey: oldRepeatJobKey } = await authorize({
      prisma: ctx.prisma,
      integrationId: input.id,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config: updatedConfigValues, ...rest } = input;

    // Config is a single field, so we need to merge it manually
    const updatedConfig = {
      ...oldConfig,
      ...updatedConfigValues,
    } satisfies UpdateIntegrationConfig;

    // Validate the config against the config schema to double check everything
    // has been merged correctly
    updateIntegrationConfigSchema.parse(updatedConfig);

    await ctx.prisma.integration
      .update({
        where: {
          id: input.id,
        },
        data: {
          ...rest,
          configSerialized: encrypt(JSON.stringify(updatedConfig)),
        },
      })
      .then(parseIntegration);

    // Delete the old job
    if (oldRepeatJobKey) {
      await integrationsQueue.removeRepeatableByKey(oldRepeatJobKey);
    }

    // Queue the integration for processing
    const { repeatJobKey } = await integrationsQueue.add(
      'processIntegration',
      {
        integrationId: input.id,
      },
      {
        repeat: {
          pattern: updatedConfig.chronExpression,
        },
        jobId: `integration-${input.id}-jobId`,
        repeatJobKey: `integration-${input.id}-repeatJobKey`,
      }
    );

    return ctx.prisma.integration
      .update({
        where: {
          id: input.id,
        },
        data: {
          repeatJobKey,
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
      await authorize({
        prisma: ctx.prisma,
        integrationId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const deletedIntegration = await ctx.prisma.integration
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseIntegration);

      if (deletedIntegration.repeatJobKey) {
        await integrationsQueue.removeRepeatableByKey(deletedIntegration.repeatJobKey);
      }

      return deletedIntegration;
    }),
});

export type ParsedIntegration = Omit<Integration, 'configSerialized'> & {
  config: IntegrationConfig;
};

export const parseIntegration = (integration: Integration, safe = true): ParsedIntegration => {
  const { configSerialized, ...rest } = integration;

  const config = JSON.parse(decrypt(configSerialized)) as IntegrationConfig;

  return {
    ...rest,
    config: safe
      ? filterConfig<IntegrationConfig>(config, INTEGRATION_DEFINITIONS[config.type].fields, config.type)
      : config,
  };
};

type AuthorizeParams<IntegrationId extends string | null> = {
  prisma: PrismaClient;
  integrationId: IntegrationId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<IntegrationId extends string | null> = IntegrationId extends null ? null : ParsedIntegration;

const authorize = async <IntegrationId extends string | null>({
  prisma,
  integrationId,
  workspaceId,
  userId,
}: AuthorizeParams<IntegrationId>): Promise<AuthorizeResult<IntegrationId>> => {
  const membership = await prisma.membership.findMany({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'You are not a member of this workspace',
    });
  }

  if (!integrationId) {
    return null as AuthorizeResult<IntegrationId>;
  }

  const integration = await prisma.integration.findUnique({
    where: {
      id: integrationId,
    },
  });

  if (!integration) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Integration not found',
    });
  }

  if (integration.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Integration not found',
    });
  }

  if (integration.userId !== userId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'This Integration does not belong to you',
    });
  }

  return parseIntegration(integration, false) as AuthorizeResult<IntegrationId>;
};
