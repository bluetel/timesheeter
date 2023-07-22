import { parseProject } from '@timesheeter/web';
import { toggl, TogglProject } from '../../api';
import { TogglIntegrationContext } from '../../lib';

export type ProjectPair = {
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

export const timesheeterProjectSelectQuery = {
  id: true,
  updatedAt: true,
  deleted: true,
  name: true,
  togglProjectId: true,
  configSerialized: true,
  taskPrefixes: {
    select: {
      prefix: true,
    },
  },
};

export const createProjectPairs = async ({ context }: { context: TogglIntegrationContext }): Promise<ProjectPair[]> => {
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
