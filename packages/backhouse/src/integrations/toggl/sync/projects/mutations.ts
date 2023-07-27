import { deleteProject, encrypt, getDefaultProjectConfig, parseProject } from '@timesheeter/web';
import { TogglProject, toggl } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import { ProjectPair, TimesheeterProject, timesheeterProjectSelectQuery } from './data';

export const updateTimesheeterProject = async ({
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

export const updateTogglProject = async ({
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
    path: { workspace_id: togglWorkspaceId, project_id: togglProject.id },
    body: {
      // Toggl Projects must have a name
      name: !!timesheeterProject.name ? timesheeterProject.name : 'Unnamed project',
      active: true,
      is_private: false,
    },
  });

  return {
    togglProject: updatedTogglProject,
    timesheeterProject,
  };
};

export const createTimesheeterProject = async ({
  context: { prisma, workspaceId },
  togglProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
}): Promise<ProjectPair> => {
  // If project name starts with "Auto created by Timesheeter - " it means it was created by
  // us and we need to create a task prefix for it

  const taskPrefixes: string[] = [];

  if (togglProject.name.startsWith('Auto created by Timesheeter - ')) {
    const prefix = togglProject.name.replace('Auto created by Timesheeter - ', '');

    taskPrefixes.push(prefix);
  }

  const timesheeterConfig = { ...getDefaultProjectConfig() };

  timesheeterConfig.taskPrefixes = taskPrefixes;

  const timesheeterProject = await prisma.project
    .create({
      data: {
        name: togglProject.name,
        workspaceId,
        configSerialized: encrypt(JSON.stringify(timesheeterConfig)),
        togglProjectId: togglProject.id,
        taskPrefixes: {
          create: taskPrefixes.map((prefix) => ({
            prefix,
            workspaceId,
          })),
        },
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((project) => parseProject(project, false));

  return {
    togglProject,
    timesheeterProject,
  };
};

export const createTogglProject = async ({
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

export const deleteTimesheeterProject = async ({
  context: { prisma, workspaceId, axiosClient, togglWorkspaceId },
  togglProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
}): Promise<ProjectPair> => {
  const timesheeterProject = await prisma.project.findFirst({
    where: {
      workspaceId,
      togglProjectId: togglProject.id,
    },
    select: {
      id: true,
    },
  });

  if (timesheeterProject) {
    await deleteProject({ prisma, projectId: timesheeterProject.id });
  }

  // Delete the project from toggl, before it was just marked as to delete
  await toggl.projects.delete({
    axiosClient: axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
      project_id: togglProject.id,
    },
  });

  return {
    togglProject,
    timesheeterProject: null,
  };
};

export const deleteTogglProject = async ({
  context: { axiosClient, togglWorkspaceId },
  togglProject,
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject;
  timesheeterProject: TimesheeterProject;
}): Promise<ProjectPair> => {
  await toggl.projects.delete({
    axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
      project_id: togglProject.id,
    },
  });

  return {
    togglProject: null,
    timesheeterProject,
  };
};
