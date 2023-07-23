import { encrypt, getDefaultProjectConfig, matchTaskRegex, parseProject } from '@timesheeter/web';
import { TogglIntegrationContext } from '../lib';
import { TimesheeterProject, timesheeterProjectSelectQuery } from '../sync';
import { TogglProject, TogglTask, TogglTimeEntry, toggl } from '../api';

export const matchTimeEntryToProject = async ({
  context,
  timeEntry,
  togglProjects,
  timesheeterProjects,
  uncategorizedTasksProject,
  togglTasks,
}: {
  context: TogglIntegrationContext;
  timeEntry: TogglTimeEntry;
  togglProjects: TogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: TogglProject;
  togglTasks: TogglTask[];
}) => {
  // The parent task may already be in a project, if so set the timesheeterProject to that project

  const parentTask = togglTasks.find((task) => task.id === timeEntry.task_id);

  if (parentTask) {
    const parentTaskProject = togglProjects.find((project) => project.id === parentTask?.id);

    if (parentTaskProject) {
      return {
        matchedProject: parentTaskProject,
        updatedTogglProjects: togglProjects,
        updatedTimesheeterProjects: timesheeterProjects,
        taskName: parentTask.name,
      };
    }
  }

  const description = timeEntry.description;

  if (!description) {
    return {
      matchedProject: uncategorizedTasksProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: `Auto created fby Timesheeter for time entry ${timeEntry.id}`,
    };
  }

  const descriptionFormatted = description.trim().toLowerCase();

  const autoAssignTimesheeterProject = timesheeterProjects.find((project) =>
    project.config.autoAssignTasks.some((autoAssignTask) =>
      descriptionFormatted.startsWith(autoAssignTask.trim().toLowerCase())
    )
  );

  if (autoAssignTimesheeterProject) {
    // We don't need to handle creating projects in timesheeter as we know that
    // they don't need to exist
    return handleAutoAssign({
      context,
      autoAssignTimesheeterProject,
      togglProjects,
      timesheeterProjects,
      description,
    });
  }

  const matchResult = matchTaskRegex(description);

  if (matchResult.variant === 'with-task') {
    return handleTaskPrefixMatch({
      context,
      matchResult,
      togglProjects,
      timesheeterProjects,
      togglTasks,
    });
  }

  return {
    matchedProject: uncategorizedTasksProject,
    updatedTogglProjects: togglProjects,
    updatedTimesheeterProjects: timesheeterProjects,
    taskName: description,
  };
};

const handleAutoAssign = async ({
  context,
  autoAssignTimesheeterProject,
  togglProjects,
  timesheeterProjects,
  description,
}: {
  context: TogglIntegrationContext;
  autoAssignTimesheeterProject: TimesheeterProject;
  togglProjects: TogglProject[];
  timesheeterProjects: TimesheeterProject[];
  description: string;
}) => {
  let updatedTogglProjects = togglProjects;

  let togglProjectId = autoAssignTimesheeterProject.togglProjectId
    ? Number(autoAssignTimesheeterProject.togglProjectId)
    : undefined;

  let autoAssignTogglProject = togglProjects.find((project) => project.id === togglProjectId);

  if (!autoAssignTogglProject) {
    autoAssignTogglProject = await toggl.projects.post({
      axiosClient: context.axiosClient,
      path: { workspace_id: context.togglWorkspaceId },
      body: {
        name: autoAssignTimesheeterProject.name,
        active: true,
        is_private: false,
      },
    });

    updatedTogglProjects = [...togglProjects, autoAssignTogglProject];
  }

  return {
    matchedProject: autoAssignTogglProject,
    updatedTogglProjects,
    updatedTimesheeterProjects: timesheeterProjects,
    taskName: description,
  };
};

const handleTaskPrefixMatch = async ({
  context,
  matchResult,
  togglProjects,
  timesheeterProjects,
  togglTasks,
}: {
  context: TogglIntegrationContext;
  matchResult: ReturnType<typeof matchTaskRegex> & {
    variant: 'with-task';
  };
  togglProjects: TogglProject[];
  timesheeterProjects: TimesheeterProject[];
  togglTasks: TogglTask[];
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

  let timesheeterProject = timesheeterProjects.find(({ taskPrefixes }) =>
    taskPrefixes.some(({ prefix }) => prefix === matchResult.prefix)
  );

  if (!timesheeterProject) {
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
        },
        select: timesheeterProjectSelectQuery,
      })
      .then((project) => parseProject(project, false));

    updatedTimesheeterProjects = [...updatedTimesheeterProjects, newTimesheeterProject];

    timesheeterProject = newTimesheeterProject;
  }

  return {
    matchedProject: togglProject,
    updatedTogglProjects,
    updatedTimesheeterProjects,
    taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
  };
};
