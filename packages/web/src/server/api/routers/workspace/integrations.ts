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
            OR: [
              {
                privateUserId: null,
              },
              {
                privateUserId: ctx.session.user.id,
              },
            ],
          },
          orderBy: {
            createdAt: 'desc',
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

    // Ensure integration privateuserid is set to the current user
    if (!!rest.privateUserId && rest.privateUserId !== ctx.session.user.id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Private user id must be the current user',
      });
    }

    return ctx.prisma.integration
      .create({
        data: {
          ...rest,
          configSerialized: encrypt(JSON.stringify(config)),
        },
      })
      .then(parseIntegration);
  }),
  update: protectedProcedure.input(updateIntegrationSchema).mutation(async ({ ctx, input }) => {
    const { config: oldConfig } = await authorize({
      prisma: ctx.prisma,
      integrationId: input.id,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config: updatedConfigValues, ...rest } = input;

    // Ensure integration privateuserid is set to the current user
    if (!!rest.privateUserId && rest.privateUserId !== ctx.session.user.id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Private user id must be the current user',
      });
    }

    // Config is a single field, so we need to merge it manually
    const updatedConfig = {
      ...oldConfig,
      ...updatedConfigValues,
    } satisfies UpdateIntegrationConfig;

    // Validate the config against the config schema to double check everything
    // has been merged correctly
    updateIntegrationConfigSchema.parse(updatedConfig);

    return ctx.prisma.integration
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

      return ctx.prisma.integration
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseIntegration);
    }),
});

export type ParsedIntegration = Omit<Integration, 'configSerialized'> & {
  config: IntegrationConfig;
};

export const parseIntegration = (integration: Integration, safe = true): ParsedIntegration => {
  const { configSerialized, ...rest } = integration;

  const unverifiedConfig = JSON.parse(decrypt(configSerialized)) as IntegrationConfig;

  const integrationDefinition = INTEGRATION_DEFINITIONS[unverifiedConfig.type];

  // In the case of new default fields being added to the config schema, we want to
  // ensure that the integration config is still valid. This is done by parsing the
  // config
  const config = integrationDefinition.configSchema.parse(unverifiedConfig);

  return {
    ...rest,
    config: safe ? filterConfig<IntegrationConfig>(config, integrationDefinition.fields, config.type) : config,
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

  if (!!integration.privateUserId && integration.privateUserId !== userId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Integration not found',
    });
  }

  return parseIntegration(integration, false) as AuthorizeResult<IntegrationId>;
};
