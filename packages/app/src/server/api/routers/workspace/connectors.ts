import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@timesheeter/app/server/api/trpc";
import { decrypt, encrypt, filterConfig } from "@timesheeter/app/server/lib/secret-helpers";
import { type Connector, type PrismaClient } from "@prisma/client";
import {
  CONNECTOR_DEFINITIONS,
  type ConnectorConfig,
  createConnectorSchema,
  updateConnectorSchema,
  connectorConfigSchema,
} from "@timesheeter/app/lib/workspace/connectors";

export const connectorsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

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
      await authorize(ctx.prisma, null, input.workspaceId, ctx.session.user.id);

      const { config, ...rest } = input;

      return ctx.prisma.connector
        .create({
          data: {
            ...rest,
            type: config.type,
            configSerialized: encrypt(JSON.stringify(input.config)),
          },
        })
        .then(parseConnector);
    }),
  update: protectedProcedure
    .input(updateConnectorSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(
        ctx.prisma,
        input.id,
        input.workspaceId,
        ctx.session.user.id
      );

      const { config, ...rest } = input;

      return ctx.prisma.connector
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
            type: config?.type,
            configSerialized: encrypt(JSON.stringify(input.config)),
          },
        })
        .then(parseConnector);
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

      return ctx.prisma.connector
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseConnector);
    }),
  startChatSession: publicProcedure
    .input(
      z.object({
        connectorId: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await ctx.prisma.connector.findUnique({
        where: {
          id: input.connectorId,
        },
      });

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      const parsedConnector = parseConnector(connector, false);
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

const authorize = async (
  prisma: PrismaClient,
  connectorId: string | null,
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

  if (!connectorId) {
    return;
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
};
