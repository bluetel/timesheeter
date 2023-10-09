import { encrypt, getDefaultProjectConfig, type matchTaskRegex, parseProject } from '@timesheeter/web';
import { type TogglIntegrationContext } from '../../lib';
import { type TimesheeterProject, timesheeterProjectSelectQuery } from '../../sync';
import { type RawTogglProject, type RawTogglTask, toggl } from '../../api';

export const handleTaskPrefixMatch = async ({
  context,
  matchResult,
  togglProjects,
  timesheeterProjects,
  togglTasks,
  createInProject,
}: {
  context: TogglIntegrationContext;
  matchResult: ReturnType<typeof matchTaskRegex> & {
    variant: 'with-task';
  };
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  togglTasks: RawTogglTask[];
  createInProject?: RawTogglProject;
}) => {
  let updatedTogglProjects = togglProjects;
  let updatedTimesheeterProjects = timesheeterProjects;

  // See if any existing tasks match the task prefix
  const searchExpression = `${matchResult.prefix}-`;

  const existingTogglTask = togglTasks.find((task) => task.name.startsWith(searchExpression));

  if (existingTogglTask) {
    const togglProject = togglProjects.find((project) => project.id === existingTogglTask.project_id);

    if (!togglProject) {
      throw new Error('Toggl project not found, this should exist as a task has it as a parent');
    }

    return {
      matchedProject: togglProject,
      updatedTogglProjects,
      updatedTimesheeterProjects,
      taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
      autoAssignTrimmedDescription: null,
    };
  }

  // See if any existing timesheeter projects match the task prefix
  const existingTimesheeterProject = timesheeterProjects.find(({ config }) =>
    config.taskPrefixes.some((prefix) => prefix === matchResult.prefix)
  );

  if (existingTimesheeterProject) {
    return handleCreateInsideExistingTimesheeterProject({
      context,
      matchResult,
      togglProjects,
      timesheeterProjects,
      existingTimesheeterProject,
    });
  }

  // The user has expressed a preference to create the task in a specific project
  if (createInProject) {
    return {
      matchedProject: createInProject,
      updatedTogglProjects,
      updatedTimesheeterProjects,
      taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
      autoAssignTrimmedDescription: null,
    };
  }

  const togglProject = await toggl.projects.post({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId },
    body: {
      name: `Auto created by Timesheeter - ${matchResult.prefix}`,
      active: true,
      is_private: false,
    },
  });

  updatedTogglProjects = [...togglProjects, togglProject];

  // We know here that we are going to need to create a new timesheeter project

  const timesheeterConfig = { ...getDefaultProjectConfig() };
  timesheeterConfig.taskPrefixes = [matchResult.prefix];

  const newTimesheeterProject = await context.prisma.project
    .create({
      data: {
        name: togglProject.name,
        workspaceId: context.workspaceId,
        taskPrefixes: {
          create: [
            {
              prefix: matchResult.prefix,
              workspaceId: context.workspaceId,
            },
          ],
        },
        configSerialized: encrypt(JSON.stringify(timesheeterConfig)),
        togglProjectId: togglProject.id,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((project) => parseProject(project, false));

  updatedTimesheeterProjects = updatedTimesheeterProjects.map((project) =>
    project.id === newTimesheeterProject.id ? newTimesheeterProject : project
  );

  return {
    matchedProject: togglProject,
    updatedTogglProjects,
    updatedTimesheeterProjects,
    taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
    autoAssignTrimmedDescription: null,
  };
};

const handleCreateInsideExistingTimesheeterProject = async ({
  context,
  matchResult,
  togglProjects,
  timesheeterProjects,
  existingTimesheeterProject,
}: {
  context: TogglIntegrationContext;
  matchResult: ReturnType<typeof matchTaskRegex> & {
    variant: 'with-task';
  };
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  existingTimesheeterProject: TimesheeterProject;
}) => {
  // See if the toggl project exists
  const existingTogglProject = togglProjects.find(
    (project) => project.id === Number(existingTimesheeterProject.togglProjectId)
  );

  if (existingTogglProject) {
    return {
      matchedProject: existingTogglProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
      autoAssignTrimmedDescription: null,
    };
  }

  // Create the toggl project
  const togglProject = await toggl.projects.post({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId },
    body: {
      name: existingTimesheeterProject.name,
      active: true,
      is_private: false,
    },
  });

  const updatedTogglProjects = [...togglProjects, togglProject];

  // Update the timesheeter project
  const updatedTimesheeterProject = await context.prisma.project
    .update({
      where: { id: existingTimesheeterProject.id },
      data: {
        togglProjectId: togglProject.id,
      },
      select: timesheeterProjectSelectQuery,
    })
    .then((project) => parseProject(project, false));

  const updatedTimesheeterProjects = timesheeterProjects.map((project) =>
    project.id === updatedTimesheeterProject.id ? updatedTimesheeterProject : project
  );

  return {
    matchedProject: togglProject,
    updatedTogglProjects,
    updatedTimesheeterProjects,
    taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
    autoAssignTrimmedDescription: null,
  };
};
