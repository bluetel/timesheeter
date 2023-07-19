import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@timesheeter/web/server/api/trpc';
import { type Membership, type PrismaClient } from '@prisma/client';
import { type MembershipRole } from '@timesheeter/web/lib';

export const membershipsRouter = createTRPCRouter({});

export type ParsedMembersip = Omit<Membership, 'role'> & {
  role: MembershipRole;
};

const parseMembership = (membership: Membership): ParsedMembersip => {
  return {
    ...membership,
    role: membership.role as MembershipRole,
  };
};

type AuthorizeParams = {
  prisma: PrismaClient;
  workspaceId: string;
  userId: string;
};

const authorize = async ({ prisma, workspaceId, userId }: AuthorizeParams) => {
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

  return membership;
};
