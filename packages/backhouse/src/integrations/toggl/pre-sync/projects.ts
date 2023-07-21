import { encrypt, getDefaultProjectConfig, matchTaskRegex, parseProject } from '@timesheeter/web';
import { TogglIntegrationContext } from '../lib';
import { TimesheeterProject, timesheeterProjectSelectQuery } from '../sync';
import { TogglProject, TogglTimeEntry, toggl } from '../api';

export const matchTimeEntryToProject = async ({
  context,
  timeEntry,
  togglProjects,
  timesheeterProjects,
  uncategorizedTasksProject,
}: {
  context: TogglIntegrationContext;
  timeEntry: TogglTimeEntry;
  togglProjects: TogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: TogglProject;
}) => {
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
}: {
  context: TogglIntegrationContext;
  matchResult: ReturnType<typeof matchTaskRegex> & {
    variant: 'with-task';
  };
  togglProjects: TogglProject[];
  timesheeterProjects: TimesheeterProject[];
}) => {
  let updatedTogglProjects = togglProjects;
  let updatedTimesheeterProjects = timesheeterProjects;

  let timesheeterProject = timesheeterProjects.find(({ taskPrefixes }) =>
    taskPrefixes.some(({ prefix }) => prefix === matchResult.prefix)
  );

  if (!timesheeterProject) {
    const newTimesheeterProject = await context.prisma.project
      .create({
        data: {
          name: `Auto created by Timesheeter - ${matchResult.prefix}`,
          workspaceId: context.workspaceId,
          taskPrefixes: {
            create: [
              {
                prefix: matchResult.prefix,
                workspaceId: context.workspaceId,
              },
            ],
          },
          configSerialized: encrypt(JSON.stringify(getDefaultProjectConfig())),
        },
        select: timesheeterProjectSelectQuery,
      })
      .then((project) => parseProject(project, false));

    updatedTimesheeterProjects = [...updatedTimesheeterProjects, newTimesheeterProject];

    timesheeterProject = newTimesheeterProject;
  }

  let togglProject = timesheeterProject.togglProjectId
    ? togglProjects.find((project) => project.id === Number(timesheeterProject?.togglProjectId))
    : undefined;

  if (!togglProject) {
    togglProject = await toggl.projects.post({
      axiosClient: context.axiosClient,
      path: { workspace_id: context.togglWorkspaceId },
      body: {
        name: timesheeterProject.name,
        active: true,
        is_private: false,
      },
    });
  }

  updatedTogglProjects = [...togglProjects, togglProject];

  return {
    matchedProject: togglProject,
    updatedTogglProjects,
    updatedTimesheeterProjects,
    taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
  };
};
