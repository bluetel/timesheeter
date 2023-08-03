import { deleteProject, encrypt, getDefaultProjectConfig, parseProject } from '@timesheeter/web';
import { toggl } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import { ProjectPair, TimesheeterProject, TogglProject, timesheeterProjectSelectQuery } from './data';
import { TogglProjectSyncRecord, togglProjectSyncRecordType, togglSyncRecordSelectQuery } from '../../sync-records';

export const updateTimesheeterProject = async ({
  context: { prisma },
  togglProject,
  timesheeterProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject & {
    deleted: false;
  };
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
  togglProject: TogglProject & {
    deleted: false;
  };
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
    togglProject: { ...updatedTogglProject, deleted: false as const },
    timesheeterProject,
  };
};

export const createTimesheeterProject = async ({
  context: { prisma, workspaceId },
  togglProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject & {
    deleted: false;
  };
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
  context: { axiosClient, prisma, togglWorkspaceId, workspaceId },
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

  // Create a new sync record as we have a new toggl entity
  await prisma.togglSyncRecord.create({
    data: {
      workspaceId,
      togglEntityId: togglProject.id,
      togglProjectId: togglProject.id,
      category: togglProjectSyncRecordType,
    },
    select: togglSyncRecordSelectQuery,
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
    togglProject: { ...togglProject, deleted: false as const },
    timesheeterProject: updatedTimesheeterProject,
  };
};

export const deleteTimesheeterProject = async ({
  context: { prisma, workspaceId, axiosClient, togglWorkspaceId },
  togglProject,
}: {
  context: TogglIntegrationContext;
  togglProject: TogglProject & {
    deleted: true;
  };
}): Promise<ProjectPair> => {
  const timesheeterProject = await prisma.project.findFirst({
    where: {
      workspaceId,
      togglProjectId: togglProject.togglEntityId,
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
      project_id: Number(togglProject.togglEntityId),
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
  togglProject: TogglProject & {
    deleted: false;
  };
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
