import {
  createWorkspaceSchema,
  membershipRoleSchema,
  updateWorkspaceSchema,
} from "@timesheeter/web/lib";
import { type PrismaClient } from "@timesheeter/web/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/web/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const managementRouter = createTRPCRouter({
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
  createWorkspace: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      // Ensure that there is only 1 membership with the role of owner and that the current user is the owner
      if (input.memberships.length !== 1 || !input.memberships[0]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A new workspace must have exactly 1 owner",
        });
      }

      if (input.memberships[0].userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only the owner can create a workspace",
        });
      }

      if (input.memberships[0].role !== "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The first user must have the role of owner",
        });
      }

      // Ensure the invitations are not listed in the memberships
      const invitationUsers = await ctx.prisma.user.findMany({
        where: {
          email: {
            in: input.invitations,
          },
        },
        select: {
          id: true,
        },
      });

      if (
        invitationUsers.some((user) =>
          input.memberships.some((membership) => membership.userId === user.id)
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invited users cannot already be members",
        });
      }

      const createdWorkspace = await ctx.prisma.workspace.create({
        data: {
          name: input.name,
          memberships: {
            create: [
              {
                userId: input.memberships[0].userId,
                role: input.memberships[0].role,
              },
            ],
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (input.invitations.length > 0) {
        const createdInvitations = await Promise.all(
          input.invitations.map((email) =>
            ctx.prisma.invitation.create({
              data: {
                email,
                workspaceId: createdWorkspace.id,
              },
              select: {
                email: true,
                id: true,
              },
            })
          )
        ).then((invitations) =>
          invitations.map((invitation) => ({
            email: invitation.email,
            invitationId: invitation.id,
          }))
        );

        await sendInviteEmails({
          workspace: {
            id: createdWorkspace.id,
            name: createdWorkspace.name,
          },
          emails: createdInvitations,
        });
      }

      return createdWorkspace;
    }),
  updateWorkspace: protectedProcedure
    .input(updateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspace } = await authorize({
        prisma: ctx.prisma,
        workspaceId: input.id,
        userId: ctx.session.user.id,
      });

      const { memberships: oldMemberships, invitations: oldInvitations } =
        workspace;

      const { memberships, invitations, ...rest } = input;

      // Ensure at least 1 membership exists, amd that there is one owner only
      if (memberships !== undefined && memberships.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A workspace must have at least 1 member",
        });
      }

      if (
        memberships !== undefined &&
        memberships.filter((membership) => membership.role === "owner")
          .length === 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A workspace must have at least 1 owner",
        });
      }

      // Ensure the invitations are not listed in the memberships
      const invitationUsers = await ctx.prisma.user.findMany({
        where: {
          email: {
            in: invitations,
          },
        },
        select: {
          id: true,
        },
      });

      if (
        memberships &&
        invitationUsers.some((user) =>
          memberships.some((membership) => membership.userId === user.id)
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invited users cannot already be members",
        });
      }

      const membershipsToDelete =
        memberships !== undefined
          ? oldMemberships.filter(
              (oldMembership) =>
                !memberships.find(
                  (membership) => membership.userId === oldMembership.userId
                )
            )
          : undefined;

      const membershipsToUpdate =
        memberships !== undefined
          ? memberships.filter((membership) =>
              oldMemberships.find(
                (oldMembership) => oldMembership.userId === membership.userId
              )
            )
          : undefined;

      const invitationsToDelete =
        invitations !== undefined
          ? oldInvitations.filter(
              (oldInvitation) =>
                !invitations.find(
                  (invitation) => invitation === oldInvitation.email
                )
            )
          : undefined;

      const invitationsToCreate =
        invitations !== undefined
          ? invitations.filter(
              (invitation) =>
                !oldInvitations.find(
                  (oldInvitation) => oldInvitation.email === invitation
                )
            )
          : undefined;

      const updatedWorkspace = await ctx.prisma.workspace.update({
        where: {
          id: workspace.id,
        },
        data: {
          ...rest,
          memberships:
            membershipsToUpdate !== undefined &&
            membershipsToDelete !== undefined
              ? {
                  deleteMany: membershipsToDelete.map((membership) => ({
                    userId: membership.userId,
                  })),
                  updateMany: membershipsToUpdate.map((membership) => ({
                    where: {
                      userId: membership.userId,
                    },
                    data: {
                      role: membership.role,
                    },
                  })),
                }
              : undefined,
          invitations:
            invitationsToDelete !== undefined
              ? {
                  deleteMany: invitationsToDelete.map((invitation) => ({
                    email: invitation.email,
                  })),
                }
              : undefined,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (invitationsToCreate) {
        const createdInvitations = await Promise.all(
          invitationsToCreate.map((email) =>
            ctx.prisma.invitation.create({
              data: {
                email,
                workspaceId: updatedWorkspace.id,
              },
              select: {
                email: true,
                id: true,
              },
            })
          )
        ).then((invitations) =>
          invitations.map((invitation) => ({
            email: invitation.email,
            invitationId: invitation.id,
          }))
        );

        await sendInviteEmails({
          workspace: {
            id: updatedWorkspace.id,
            name: updatedWorkspace.name,
          },
          emails: createdInvitations,
        });
      }

      return updatedWorkspace;
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
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      name: true,
      memberships: {
        select: {
          userId: true,
          role: true,
        },
      },
      invitations: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!workspace) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workspace not found",
    });
  }

  const membership = workspace.memberships.find(
    (membership) => membership.userId === userId
  );

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this workspace",
    });
  }

  const role = membershipRoleSchema.parse(membership.role);

  // Ensure the user is an owner of the workspace
  if (role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an owner of the workspace to perform this action",
    });
  }

  return {
    workspace,
    role,
  };
};

export const sendInviteEmails = async ({
  workspace,
  emails,
}: {
  workspace: {
    id: string;
    name: string;
  };
  emails: {
    email: string;
    invitationId: string;
  }[];
}) =>
  Promise.all(
    emails.map(({ email, invitationId }) => {
      // Currently disabled
      return Promise.resolve();

      // const { pretty, plainText, title } = inviteEmail({
      //   workspaceName: workspace.name,
      //   email,
      //   inviteLink: `${env.NEXT_PUBLIC_URL}/accept-invitation/${invitationId}`,
      //   publicUrl: env.NEXT_PUBLIC_URL,
      // });

      // return send({
      //   subject: title,
      //   to: email,
      //   text: plainText,
      //   html: pretty,
      // });
    })
  );
