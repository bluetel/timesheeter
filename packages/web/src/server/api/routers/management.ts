import { createTRPCRouter, protectedProcedure } from '@timesheeter/web/server/api/trpc';

export const workspaceManagementRouter = createTRPCRouter({
  myWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.membership.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return memberships.map((membership) => ({
      ...membership.workspace,
      role: membership.role,
    }));
  }),
});
