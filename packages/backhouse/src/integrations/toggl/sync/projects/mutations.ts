import { encrypt, getDefaultProjectConfig, parseProject } from '@timesheeter/web';
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

export const createTimesheeterProject = async ({
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
