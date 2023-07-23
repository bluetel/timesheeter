import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@timesheeter/web/server/api/trpc';
import {
  createProjectSchema,
  PROJECT_DEFINITIONS,
  updateProjectSchema,
  type ProjectConfig,
  type UpdateProjectConfig,
  updateProjectConfigSchema,
} from '@timesheeter/web/lib/workspace/projects';
import { decrypt, encrypt, filterConfig } from '@timesheeter/web/server/lib/secret-helpers';
import { type Project, type PrismaClient } from '@prisma/client';
import { type WithConfig } from '@timesheeter/web/server/lib/workspace-types';
import { deleteProject } from '@timesheeter/web/server/deletion';

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
            deleted: false,
          },
          include: {
            taskPrefixes: {
              select: {
                id: true,
                prefix: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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
          deleted: false,
        },
        select: {
          id: true,
          name: true,
          taskPrefixes: {
            select: {
              id: true,
              prefix: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    }),
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    await authorize({
      prisma: ctx.prisma,
      projectId: null,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config, ...rest } = input;

    // Ensure workspace doesnlt already have a task prefix matching the ones in the config and
    // is not deleted
    const existingTaskPrefixes = await ctx.prisma.taskPrefix.findMany({
      where: {
        workspaceId: input.workspaceId,
        prefix: {
          in: config.taskPrefixes,
        },
        deleted: false,
      },
    });

    if (existingTaskPrefixes[0]) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Task prefix ${existingTaskPrefixes[0].prefix} already exists`,
      });
    }

    const createdProject = await ctx.prisma.project
      .create({
        data: {
          ...rest,
          configSerialized: encrypt(JSON.stringify(config)),
          taskPrefixes: {
            create: config.taskPrefixes.map((taskPrefix) => ({
              prefix: taskPrefix,
              workspaceId: input.workspaceId,
            })),
          },
        },
        include: {
          taskPrefixes: {
            select: {
              id: true,
              prefix: true,
            },
          },
        },
      })
      .then(parseProject);

    return createdProject;
  }),
  update: protectedProcedure.input(updateProjectSchema).mutation(async ({ ctx, input }) => {
    const { config: oldConfig, taskPrefixes: oldTaskPrefixes } = await authorize({
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

    const taskPrefixesToDelete = oldTaskPrefixes.filter(
      (oldTaskPrefix) => !updatedConfig.taskPrefixes.includes(oldTaskPrefix.prefix)
    );

    const taskPrefixesToCreate = updatedConfig.taskPrefixes.filter(
      (updatedTaskPrefix) => !oldTaskPrefixes.map((oldTaskPrefix) => oldTaskPrefix.prefix).includes(updatedTaskPrefix)
    );

    // Validate the config against the config schema to double check everything
    // has been merged correctly
    updateProjectConfigSchema.parse(updatedConfig);

    // Ensure workspace doesnlt already have a task prefix matching the ones in the config and
    // is not deleted
    const existingTaskPrefixes = await ctx.prisma.taskPrefix.findMany({
      where: {
        workspaceId: input.workspaceId,
        prefix: {
          in: taskPrefixesToCreate,
        },
        deleted: false,
      },
    });

    if (existingTaskPrefixes[0]) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Task prefix ${existingTaskPrefixes[0].prefix} already exists`,
      });
    }

    await ctx.prisma.project
      .update({
        where: {
          id: input.id,
        },
        data: {
          ...rest,
          configSerialized: encrypt(JSON.stringify(updatedConfig)),
          taskPrefixes: {
            deleteMany: taskPrefixesToDelete.map((taskPrefix) => ({
              id: taskPrefix.id,
            })),
            create: taskPrefixesToCreate.map((taskPrefix) => ({
              prefix: taskPrefix,
              workspaceId: input.workspaceId,
            })),
          },
        },
        include: {
          taskPrefixes: {
            select: {
              id: true,
              prefix: true,
            },
          },
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

      await deleteProject({ prisma: ctx.prisma, projectId: input.id });
    }),
});

export type ParsedProject<ProjectType extends WithConfig = Project> = Omit<ProjectType, 'configSerialized'> & {
  config: ProjectConfig;
};

export const parseProject = <ProjectType extends WithConfig>(
  project: ProjectType,
  safe = true
): ParsedProject<ProjectType> => {
  const { configSerialized, ...rest } = project;

  const config = JSON.parse(decrypt(configSerialized)) as ProjectConfig;

  return {
    ...rest,
    config: safe ? filterConfig<ProjectConfig>(config, PROJECT_DEFINITIONS[config.type].fields, config.type) : config,
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
  : ParsedProject<
      Project & {
        taskPrefixes: {
          id: string;
          prefix: string;
        }[];
      }
    >;

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
      code: 'NOT_FOUND',
      message: 'You are not a member of this workspace',
    });
  }

  if (!projectId) {
    return null as AuthorizeResult<ProjectId>;
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      taskPrefixes: {
        select: {
          id: true,
          prefix: true,
        },
      },
    },
  });

  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    });
  }

  if (project.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    });
  }

  return parseProject(project, false) as AuthorizeResult<ProjectId>;
};
