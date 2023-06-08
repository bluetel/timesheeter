import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/app/server/api/trpc";
import {
  createConnectorSchema,
  CONNECTOR_DEFINITIONS,
  updateConnectorSchema,
  type ConnectorConfig,
  connectorConfigSchema,
} from "@timesheeter/app/lib/workspace/connectors";
import {
  decrypt,
  encrypt,
  filterConfig,
} from "@timesheeter/app/server/lib/secret-helpers";
import { type Connector, type PrismaClient } from "@prisma/client";
import { connectorsQueue } from "@timesheeter/app/server/bullmq";

export const connectorsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        connectorId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.connector
        .findMany({
          where: {
            workspaceId: input.workspaceId,
          },
        })
        .then((connectors) =>
          connectors.map((connector) => parseConnector(connector))
        );
    }),
  create: protectedProcedure
    .input(createConnectorSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        connectorId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config, ...rest } = input;

      const createdConnector = await ctx.prisma.connector
        .create({
          data: {
            ...rest,
            configSerialized: encrypt(JSON.stringify(input.config)),
          },
        })
        .then(parseConnector);

      // Queue the connector for processing
      await connectorsQueue.add(
        "processConnector",
        {
          connectorId: createdConnector.id,
        },
        {
          repeat: {
            pattern: config.chronExpression,
          },
        }
      );

      return createdConnector;
    }),
  update: protectedProcedure
    .input(updateConnectorSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        connectorId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config: oldConfig, repeatJobKey: oldRepeatJobKey } =
        await ctx.prisma.connector
          .findUnique({
            where: {
              id: input.id,
            },
          })
          .then((connector) => {
            if (!connector) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Connector not found after authorization",
              });
            }

            return parseConnector(connector, false);
          });

      const { config: updatedConfigValues, ...rest } = input;

      const updatedConfig = {
        oldConfig,
        ...updatedConfigValues,
      };

      // Validate the config against the ConnectorConfigSchema

      connectorConfigSchema.parse(updatedConfig);

      await ctx.prisma.connector
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
            ...updatedConfig,
          },
        })
        .then(parseConnector);

      // Delete the old job
      if (oldRepeatJobKey) {
        await connectorsQueue.removeRepeatableByKey(oldRepeatJobKey);
      }

      // Queue the connector for processing
      const { repeatJobKey } = await connectorsQueue.add(
        "processConnector",
        {
          connectorId: input.id,
        },
        {
          repeat: {
            pattern: updatedConfig.chronExpression,
          },
        }
      );

      return ctx.prisma.connector.update({
        where: {
          id: input.id,
        },
        data: {
          repeatJobKey,
        },
      });
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
        connectorId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const deletedConnector = await ctx.prisma.connector
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseConnector);

      if (deletedConnector.repeatJobKey) {
        await connectorsQueue.removeRepeatableByKey(
          deletedConnector.repeatJobKey
        );
      }

      return deletedConnector;
    }),
});

export type ParsedConnector = Omit<Connector, "configSerialized"> & {
  config: ConnectorConfig;
};

export const parseConnector = (
  connector: Connector,
  safe = true
): ParsedConnector => {
  const config = JSON.parse(
    decrypt(connector.configSerialized)
  ) as ConnectorConfig;

  return {
    ...connector,
    config: safe
      ? filterConfig<ConnectorConfig>(
          config,
          CONNECTOR_DEFINITIONS[config.type].fields,
          config.type
        )
      : config,
  };
};

type AuthorizeParams<ConnectorId extends string | null> = {
  prisma: PrismaClient;
  connectorId: ConnectorId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<ConnectorId extends string | null> =
  ConnectorId extends null ? null : Connector;

const authorize = async <ConnectorId extends string | null>({
  prisma,
  connectorId,
  workspaceId,
  userId,
}: AuthorizeParams<ConnectorId>): Promise<AuthorizeResult<ConnectorId>> => {
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

  if (!connectorId) {
    return null as AuthorizeResult<ConnectorId>;
  }

  const connector = await prisma.connector.findUnique({
    where: {
      id: connectorId,
    },
  });

  if (!connector) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connector not found",
    });
  }

  if (connector.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connector not found",
    });
  }

  return connector as AuthorizeResult<ConnectorId>;
};
