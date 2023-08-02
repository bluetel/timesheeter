import { encrypt, getDefaultProjectConfig, matchTaskRegex, parseProject } from '@timesheeter/web';
import { TogglIntegrationContext } from '../lib';
import { TimesheeterProject, timesheeterProjectSelectQuery } from '../sync';
import { RawTogglProject, RawTogglTask, RawTogglTimeEntry, toggl } from '../api';

export const matchTimeEntryToProject = async ({
  context,
  timeEntry,
  togglProjects,
  timesheeterProjects,
  uncategorizedTasksProject,
  togglTasks,
}: {
  context: TogglIntegrationContext;
  timeEntry: RawTogglTimeEntry;
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: RawTogglProject;
  togglTasks: RawTogglTask[];
}) => {
  // The parent task may already be in a project, if so set the timesheeterProject to that project
  if (timeEntry.project_id) {
    const togglProject = togglProjects.find((project) => project.id === timeEntry.project_id);

    if (!togglProject) {
      throw new Error('Toggl project not found, this should exist as a task has it as a parent');
    }

    const matchResult = matchTaskRegex(timeEntry.description ?? '');

    // Even though the time entry has a project, the task prefix may not match
    if (matchResult.variant === 'with-task') {
      return handleTaskPrefixMatch({
        context,
        matchResult,
        togglProjects,
        timesheeterProjects,
        togglTasks,
        createInProject: togglProject,
      });
    }

    return {
      matchedProject: togglProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: matchResult.description,
    };
  }

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
      taskName: `Auto created by Timesheeter for time entry ${timeEntry.id}`,
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
  return handleNoTaskPrefixMatch({
    description,
    togglProjects,
    timesheeterProjects,
    uncategorizedTasksProject,
    togglTasks,
  });
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
  togglProjects: RawTogglProject[];
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
    };
  }

  // The user has expressed a preference to create the task in a specific project
  if (createInProject) {
    return {
      matchedProject: createInProject,
      updatedTogglProjects,
      updatedTimesheeterProjects,
      taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
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
  };
};

const handleNoTaskPrefixMatch = async ({
  description,
  togglProjects,
  timesheeterProjects,
  uncategorizedTasksProject,
  togglTasks,
}: {
  description: string;
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: RawTogglProject;
  togglTasks: RawTogglTask[];
}) => {
  // See if any existing tasks match the task name
  const existingTogglTask = togglTasks.find((task) => task.name === description);

  if (existingTogglTask) {
    const existingTogglProject = togglProjects.find((project) => project.id === existingTogglTask?.project_id);

    if (!existingTogglProject) {
      throw new Error('Toggl project not found, this should exist as a task has it as a parent');
    }

    return {
      matchedProject: existingTogglProject,
      updatedTogglProjects: togglProjects,
      updatedTimesheeterProjects: timesheeterProjects,
      taskName: description,
    };
  }

  return {
    matchedProject: uncategorizedTasksProject,
    updatedTogglProjects: togglProjects,
    updatedTimesheeterProjects: timesheeterProjects,
    taskName: description,
  };
};
