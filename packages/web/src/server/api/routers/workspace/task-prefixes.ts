import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export const taskPrefixesRouter = createTRPCRouter({
  listMinimal: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.taskPrefix.findMany({
        where: {
          workspaceId: input.workspaceId,
        },
        select: {
          id: true,
          prefix: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),
});

const authorize = async ({
  prisma,
  workspaceId,
  userId,
}: {
  prisma: PrismaClient;
  workspaceId: string;
  userId: string;
}) => {
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
};
