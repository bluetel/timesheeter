import { encrypt, getDefaultProjectConfig, parseProject } from '@timesheeter/web';
import { toggl, TogglProject } from '../api';
import { TogglIntegrationContext } from '../lib';

type ProjectPair = {
  togglProject: TogglProject | null;
  timesheeterProject: TimesheeterProject | null;
};

/** Once we have synced projects each pair always has a toggl project, though it
 * may be marked as deleted
 */
export type EvaluatedProjectPair = {
  togglProject: TogglProject;
  timesheeterProject: TimesheeterProject | null;
};

export const syncProjects = async ({
  context,
}: {
  context: TogglIntegrationContext;
}): Promise<EvaluatedProjectPair[]> => {
  const projectPairs = await createProjectPairs({ context });

  // As we update the timesheeter projects in the loop, we need to store the updated projects
  const updatedProjectPairs = [] as ProjectPair[];

  // Loop through all project pairs and create/update/delete projects as needed
  for (const projectPair of projectPairs) {
    const { togglProject, timesheeterProject } = projectPair;

    // If both projects exist, update the timesheeter project with the toggl project data
    if (togglProject && !togglProject.deleted && timesheeterProject) {
      // If both unchanged, skip
      if (
        togglProject.name === timesheeterProject.name &&
        BigInt(togglProject.id) === timesheeterProject.togglProjectId
      ) {
        updatedProjectPairs.push(projectPair);
        continue;
      }

      // Check to see which project has been updated more recently, then copy the data from the newer project to the older one

      if (togglProject.at > timesheeterProject.updatedAt) {
        // Update the timesheeter project with the toggl project data

        updatedProjectPairs.push(await updateTimesheeterProject({ context, timesheeterProject, togglProject }));
        continue;
      }

      // Update the toggl project with the timesheeter project data
      updatedProjectPairs.push(await updateTogglProject({ context, timesheeterProject, togglProject }));
      continue;
    }

    // If only the toggl project exists and not deleted, create a new timesheeter project
    if (togglProject && !togglProject.deleted && !timesheeterProject) {
      updatedProjectPairs.push(await createTimesheeterProject({ context, togglProject }));
      continue;
    }

    // If only the timesheeter project exists, create a new toggl project
    if (!togglProject && timesheeterProject) {
      updatedProjectPairs.push(await createTogglProject({ context, timesheeterProject }));
      continue;
    }

    // If only the toggl project exists and is deleted, delete the timesheeter project
    if (togglProject && togglProject.deleted && timesheeterProject) {
      updatedProjectPairs.push(await deleteTimesheeterProject({ context, togglProject }));
      continue;
    }

    console.warn('Unreachable code reached in syncProjects');
    updatedProjectPairs.push(projectPair);
  }

  // Ensure that all pairs have a toggl project
  return updatedProjectPairs
    .map((projectPair) => {
      if (projectPair.togglProject) {
        return projectPair as EvaluatedProjectPair;
      }

      return null;
    })
    .filter((projectPair): projectPair is EvaluatedProjectPair => !!projectPair);
};

const createProjectPairs = async ({ context }: { context: TogglIntegrationContext }): Promise<ProjectPair[]> => {
  const { togglProjects, timesheeterProjects } = await getProjectData({ context });

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

export const timesheeterProjectSelectQuery = {
  id: true,
  updatedAt: true,
  name: true,
  togglProjectId: true,
  configSerialized: true,
  taskPrefixes: {
    select: {
      prefix: true,
    },
  },
};

const getProjectData = async ({
  context: { prisma, workspaceId, togglWorkspaceId, axiosClient },
}: {
  context: TogglIntegrationContext;
}) => {
  const togglProjectsPromise = toggl.projects.get({ axiosClient, path: { workspace_id: togglWorkspaceId } });

  const timesheeterProjectsPromise = prisma.project
    .findMany({
      where: {
        workspaceId,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((projects) => projects.map((project) => parseProject(project, false)));

  const [togglProjects, timesheeterProjects] = await Promise.all([togglProjectsPromise, timesheeterProjectsPromise]);

  return {
    togglProjects,
    timesheeterProjects,
  };
};

export type TimesheeterProject = Awaited<ReturnType<typeof getProjectData>>['timesheeterProjects'][0];

const updateTimesheeterProject = async ({
  context: { prisma },
  togglProject,
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
  timesheeterProject: TimesheeterProject;
}): Promise<ProjectPair> => {
  const updatedTimesheeterProject = await prisma.project
    .update({
      where: {
        id: timesheeterProject.id,
      },
      data: {
        name: togglProject.name,
        togglProjectId: togglProject.id,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((project) => parseProject(project, false));

  return {
    togglProject,
    timesheeterProject: updatedTimesheeterProject,
  };
};

const updateTogglProject = async ({
  context: { axiosClient, togglWorkspaceId },
  togglProject,
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
  timesheeterProject: TimesheeterProject;
}): Promise<ProjectPair> => {
  const updatedTogglProject = await toggl.projects.put({
    axiosClient,
    path: { workspaceId: togglWorkspaceId, projectId: togglProject.id },
    body: {
      name: timesheeterProject.name,
      active: true,
      is_private: false,
    },
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
  const timesheeterProject = await prisma.project
    .create({
      data: {
        name: togglProject.name,
        workspaceId,
        configSerialized: encrypt(JSON.stringify(getDefaultProjectConfig())),
        togglProjectId: togglProject.id,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((project) => parseProject(project, false));

  return {
    togglProject,
    timesheeterProject,
  };
};

const createTogglProject = async ({
  context: { axiosClient, prisma, togglWorkspaceId },
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  timesheeterProject: TimesheeterProject;
}): Promise<ProjectPair> => {
  const togglProject = await toggl.projects.post({
    axiosClient,
    path: { workspace_id: togglWorkspaceId },
    body: {
      name: timesheeterProject.name,
      active: true,
      is_private: false,
    },
  });

  const updatedTimesheeterProject = await prisma.project
    .update({
      where: {
        id: timesheeterProject.id,
      },
      data: {
        togglProjectId: togglProject.id,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((project) => parseProject(project, false));

  return {
    togglProject,
    timesheeterProject: updatedTimesheeterProject,
  };
};

const deleteTimesheeterProject = async ({
  context: { prisma, workspaceId },
  togglProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
}): Promise<ProjectPair> => {
  await prisma.project.deleteMany({
    where: {
      workspaceId: workspaceId,
      togglProjectId: togglProject.id,
    },
  });

  return {
    togglProject,
    timesheeterProject: null,
  };
};
