import { parseProject } from '@timesheeter/web';
import { toggl, RawTogglProject } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import { TogglProjectSyncRecord, togglProjectSyncRecordType, togglSyncRecordSelectQuery } from '../../sync-records';

export type TogglProject =
  | (RawTogglProject & {
      deleted: false;
    })
  | ({
      deleted: true;
    } & TogglProjectSyncRecord);

const getProjectData = async ({
  context: { prisma, workspaceId, togglWorkspaceId, axiosClient },
}: {
  context: TogglIntegrationContext;
}) => {
  const togglProjectsPromise = toggl.projects
    .get({ axiosClient, path: { workspace_id: togglWorkspaceId } })
    .then((projects) => projects.map((project) => ({ ...project, deleted: false as const })));

  const togglProjectSyncRecordsPromise = prisma.togglSyncRecord.findMany({
    where: {
      workspaceId,
      category: togglProjectSyncRecordType,
    },
    select: togglSyncRecordSelectQuery,
  }) as Promise<TogglProjectSyncRecord[]>;

  const timesheeterProjectsPromise = prisma.project
    .findMany({
      where: {
        workspaceId,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((projects) => projects.map((project) => parseProject(project, false)));

  const [togglProjects, togglProjectSyncRecords, timesheeterProjects] = await Promise.all([
    togglProjectsPromise,
    togglProjectSyncRecordsPromise,
    timesheeterProjectsPromise,
  ]);

  return {
    togglProjects,
    timesheeterProjects,
    togglProjectSyncRecords,
  };
};

export type TimesheeterProject = Awaited<ReturnType<typeof getProjectData>>['timesheeterProjects'][number];

export type ProjectPair = {
  togglProject: TogglProject | null;
  timesheeterProject: TimesheeterProject | null;
};

/** Once we have synced projects each pair always has a toggl project, though it
 * may be marked as deleted
 */
export type EvaluatedProjectPair = {
  togglProject: TogglProject & {
    deleted: false;
  };
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
  const { togglProjects, timesheeterProjects, togglProjectSyncRecords } = await getProjectData({ context });
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

  const timesheeterProjectsWithoutTogglProject = timesheeterProjects.filter(
    (timesheeterProject) => !timesheeterProject.togglProjectId
  );

  timesheeterProjectsWithoutTogglProject.forEach((timesheeterProject) => {
    projectPairs.push({
      togglProject: null,
      timesheeterProject,
    });
  });

  // Add togglProjectSyncRecords that are not present in togglProjects
  const togglProjectSyncRecordsWithoutTogglProject = togglProjectSyncRecords.filter(
    (togglProjectSyncRecord) =>
      !togglProjects.find((togglProject) => togglProject.id === Number(togglProjectSyncRecord.togglEntityId))
  );

  togglProjectSyncRecordsWithoutTogglProject.forEach((togglProjectSyncRecord) => {
    const timesheeterProject = timesheeterProjects.find(
      (timesheeterProject) => timesheeterProject.togglProjectId === togglProjectSyncRecord.togglEntityId
    );

    if (timesheeterProject) {
      projectPairs.push({
        togglProject: {
          ...togglProjectSyncRecord,
          deleted: true,
        },
        timesheeterProject,
      });
    }
  });

  return projectPairs;
};
