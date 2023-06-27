import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/app/server/api/trpc";
import {
  createProjectSchema,
  PROJECT_DEFINITIONS,
  updateProjectSchema,
  type ProjectConfig,
  type UpdateProjectConfig,
  updateProjectConfigSchema,
} from "@timesheeter/app/lib/workspace/projects";
import {
  decrypt,
  encrypt,
  filterConfig,
} from "@timesheeter/app/server/lib/secret-helpers";
import { type Project, type PrismaClient } from "@prisma/client";

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        projectId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.project
        .findMany({
          where: {
            workspaceId: input.workspaceId,
          },
        })
        .then((projects) => projects.map((project) => parseProject(project)));
    }),
  listMinimal: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        projectId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
        },
        select: {
          id: true,
          name: true,
        },
      });
    }),
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        projectId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config, ...rest } = input;

      const createdProject = await ctx.prisma.project
        .create({
          data: {
            ...rest,
            configSerialized: encrypt(JSON.stringify(config)),
          },
        })
        .then(parseProject);

      return createdProject;
    }),
  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { config: oldConfig } = await authorize({
        prisma: ctx.prisma,
        projectId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config: updatedConfigValues, ...rest } = input;

      // Config is a single field, so we need to merge it manually
      const updatedConfig = {
        ...oldConfig,
        ...updatedConfigValues,
      } satisfies UpdateProjectConfig;

      // Validate the config against the config schema to double check everything
      // has been merged correctly
      updateProjectConfigSchema.parse(updatedConfig);

      await ctx.prisma.project
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
            configSerialized: encrypt(JSON.stringify(updatedConfig)),
          },
        })
        .then(parseProject);
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
        projectId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const deletedProject = await ctx.prisma.project
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseProject);

      return deletedProject;
    }),
});

export type ParsedProject = Omit<Project, "configSerialized"> & {
  config: ProjectConfig;
};

export const parseProject = (project: Project, safe = true): ParsedProject => {
  const { configSerialized, ...rest } = project;

  const config = JSON.parse(decrypt(configSerialized)) as ProjectConfig;

  return {
    ...rest,
    config: safe
      ? filterConfig<ProjectConfig>(
          config,
          PROJECT_DEFINITIONS[config.type].fields,
          config.type
        )
      : config,
  };
};

type AuthorizeParams<ProjectId extends string | null> = {
  prisma: PrismaClient;
  projectId: ProjectId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<ProjectId extends string | null> = ProjectId extends null
  ? null
  : ParsedProject;

const authorize = async <ProjectId extends string | null>({
  prisma,
  projectId,
  workspaceId,
  userId,
}: AuthorizeParams<ProjectId>): Promise<AuthorizeResult<ProjectId>> => {
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

  if (!projectId) {
    return null as AuthorizeResult<ProjectId>;
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  if (project.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  return parseProject(project, false) as AuthorizeResult<ProjectId>;
};
