import { ParsedProject, encrypt, getDefaultProjectConfig, parseProject } from '@timesheeter/web';
import { TogglProject, togglProjectMutationSchema } from '../api/projects';
import { TogglIntegrationContext } from '../lib';
import { toggl } from '../api';

type ProjectPair = {
  togglProject: TogglProject | null;
  timesheeterProject: TimesheeterProject | null;
};

export const syncProjects = async ({ context }: { context: TogglIntegrationContext }): Promise<ProjectPair[]> => {
  const projectPairs = await createProjectPairs({ context });

  // As we update the timesheeter projects in the loop, we need to store the updated projects
  const updatedProjectPairs = [] as ProjectPair[];

  // Loop through all project pairs and create/update/delete projects as needed
  for (const projectPair of projectPairs) {
    const { togglProject, timesheeterProject } = projectPair;

    // If both projects exist, update the timesheeter project with the toggl project data
    if (togglProject && !togglProject.deleted && timesheeterProject) {
      // Check to see which project has been updated more recently, then copy the data from the newer project to the older one

      if (togglProject.at > timesheeterProject.updatedAt) {
        // Update the timesheeter project with the toggl project data

        updatedProjectPairs.push(await updateTimesheeterProject({ context, timesheeterProject, togglProject }));
        continue;
      }

      if (timesheeterProject.updatedAt > togglProject.at) {
        // Update the toggl project with the timesheeter project data
        updatedProjectPairs.push(await updateTogglProject({ context, timesheeterProject, togglProject }));
        continue;
      }

      // In rare case that both have the same timestamp push current project pair
      updatedProjectPairs.push(projectPair);
    }

    // If only the toggl project exists and not deleted, create a new timesheeter project
    if (togglProject && !togglProject.deleted && !timesheeterProject) {
      updatedProjectPairs.push(await createTimesheeterProject({ context, togglProject }));
      continue;
    }

    // If only the toggl project exists and is deleted, delete the timesheeter project
    if (togglProject && togglProject.deleted && timesheeterProject) {
      updatedProjectPairs.push(await deleteTimesheeterProject({ context, togglProject }));
      continue;
    }

    // If only the timesheeter project exists, create a new toggl project
    if (!togglProject && timesheeterProject) {
      updatedProjectPairs.push(await createTogglProject({ context, timesheeterProject }));
      continue;
    }

    console.warn('Unreachable code reached in syncProjects');
    updatedProjectPairs.push(projectPair);
  }

  return updatedProjectPairs;
};

const createProjectPairs = async ({ context }: { context: TogglIntegrationContext }): Promise<ProjectPair[]> => {
  const { togglProjects, timesheeterProjects } = await getProjectData(context);

  const projectPairs: ProjectPair[] = [];

  // One toggl project can only be linked to one timesheeter project, pairs may not exist,
  // in such case a pair with null values is created
  for (const togglProject of togglProjects) {
    const timesheeterProject = timesheeterProjects.find((timesheeterProject) => {
      return timesheeterProject?.togglProjectId?.toString() === togglProject.id.toString();
    });

    projectPairs.push({
      togglProject,
      timesheeterProject: timesheeterProject ?? null,
    });
  }

  const timesheeterProjectsWithoutTogglProject = timesheeterProjects.filter((timesheeterProject) => {
    return !timesheeterProject.togglProjectId;
  });

  timesheeterProjectsWithoutTogglProject.forEach((timesheeterProject) => {
    projectPairs.push({
      togglProject: null,
      timesheeterProject,
    });
  });

  return projectPairs;
};

const timesheeterProjectSelectQuery = {
  id: true,
  updatedAt: true,
  name: true,
  togglProjectId: true,
  configSerialized: true,
};

const getProjectData = async ({ prisma, workspaceId, togglWorkspaceId, axiosClient }: TogglIntegrationContext) => {
  const projectsPromise = toggl.projects.get({ axiosClient, path: { workspace_id: togglWorkspaceId } });

  const timesheeterProjectsPromise = prisma.project
    .findMany({
      where: {
        workspaceId,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((projects) => projects.map((project) => parseProject(project, false)));

  const [togglProjects, timesheeterProjects] = await Promise.all([projectsPromise, timesheeterProjectsPromise]);

  return {
    togglProjects,
    timesheeterProjects,
  };
};

type TimesheeterProject = Awaited<ReturnType<typeof getProjectData>>['timesheeterProjects'][0];

const updateTimesheeterProject = async ({
  context,
  togglProject,
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
  timesheeterProject: TimesheeterProject;
}): Promise<ProjectPair> => {
  const updatedTimesheeterProject = await context.prisma.project
    .update({
      where: {
        id: timesheeterProject.id,
      },
      data: {
        name: togglProject.name,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then(parseProject);

  return {
    togglProject,
    timesheeterProject: updatedTimesheeterProject,
  };
};

const updateTogglProject = async ({
  context,
  togglProject,
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
  timesheeterProject: TimesheeterProject;
}): Promise<ProjectPair> => {
  const updatedTogglProject = await toggl.projects.put({
    axiosClient: context.axiosClient,
    path: { workspaceId: context.togglWorkspaceId, projectId: togglProject.id },
    body: togglProjectMutationSchema.parse({
      name: timesheeterProject.name,
    }),
  });

  return {
    togglProject: updatedTogglProject,
    timesheeterProject,
  };
};

const createTimesheeterProject = async ({
  context: { prisma, workspaceId },
  togglProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
}): Promise<ProjectPair> => {
  const project = await prisma.project
    .create({
      data: {
        name: togglProject.name,
        workspaceId,
        configSerialized: encrypt(JSON.stringify(getDefaultProjectConfig())),
      },
      select: timesheeterProjectSelectQuery,
    })
    .then(parseProject);

  return {
    togglProject,
    timesheeterProject: project,
  };
};

const createTogglProject = async ({
  context,
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  timesheeterProject: TimesheeterProject;
}): Promise<ProjectPair> => {
  const togglProject = await toggl.projects.post({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId },
    body: togglProjectMutationSchema.parse({
      name: timesheeterProject.name,
    }),
  });

  const updatedTimesheeterProject = await context.prisma.project
    .update({
      where: {
        id: timesheeterProject.id,
      },
      data: {
        togglProjectId: togglProject.id,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then(parseProject);

  return {
    togglProject,
    timesheeterProject: updatedTimesheeterProject,
  };
};

const deleteTimesheeterProject = async ({
  context,
  togglProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
}): Promise<ProjectPair> => {
  await context.prisma.project.deleteMany({
    where: {
      workspaceId: context.workspaceId,
      togglProjectId: togglProject.id,
    },
  });

  return {
    togglProject,
    timesheeterProject: null,
  };
};
