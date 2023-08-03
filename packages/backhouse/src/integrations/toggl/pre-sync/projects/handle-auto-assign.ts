import { TogglIntegrationContext } from '../../lib';
import { TimesheeterProject, timesheeterProjectSelectQuery } from '../../sync';
import { RawTogglProject, RawTogglTimeEntry, toggl } from '../../api';
import { parseProject } from '@timesheeter/web/server';

export const handleAutoAssign = async ({
  context,
  autoAssignTimesheeterProject,
  togglProjects,
  timesheeterProjects,
  trimmedDescription,
  autoAssignPrefix,
}: {
  context: TogglIntegrationContext;
  autoAssignTimesheeterProject: TimesheeterProject;
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  trimmedDescription: string;
  autoAssignPrefix: string;
}) => {
  let updatedTogglProjects = togglProjects;
  let updatedTimesheeterProjects = timesheeterProjects;

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

    // Update the timesheeter project with the new toggl project id
    const newTimesheeterProject = await context.prisma.project
      .update({
        where: { id: autoAssignTimesheeterProject.id },
        data: {
          togglProjectId: autoAssignTogglProject.id,
        },
        select: timesheeterProjectSelectQuery,
      })
      .then((newTimesheeterProject) => parseProject(newTimesheeterProject, false));

    updatedTogglProjects = [...togglProjects, autoAssignTogglProject];

    updatedTimesheeterProjects = timesheeterProjects.map((timesheeterProject) =>
      timesheeterProject.id === newTimesheeterProject.id ? newTimesheeterProject : timesheeterProject
    );
  }

  return {
    matchedProject: autoAssignTogglProject,
    updatedTogglProjects,
    updatedTimesheeterProjects,
    taskName: autoAssignPrefix,
    autoAssignTrimmedDescription: trimmedDescription,
  };
};

export const findAutoAssignMatch = ({
  timeEntry,
  timesheeterProjects,
}: {
  timeEntry: RawTogglTimeEntry;
  timesheeterProjects: TimesheeterProject[];
}) => {
  if (!timeEntry.description) {
    return {
      match: false as const,
    };
  }

  const descriptionTrimmed = timeEntry.description.trim();
  const descriptionLowerCase = descriptionTrimmed.toLowerCase();

  const timesheeterProject = timesheeterProjects.find((project) =>
    project.config.autoAssignTasks.some((autoAssignTask) =>
      descriptionLowerCase.startsWith(autoAssignTask.trim().toLowerCase())
    )
  );

  if (!timesheeterProject) {
    return {
      match: false as const,
    };
  }

  const autoAssignPrefix = timesheeterProject.config.autoAssignTasks.find((autoAssignTask) =>
    descriptionLowerCase.startsWith(autoAssignTask.trim().toLowerCase())
  );

  if (!autoAssignPrefix) {
    throw new Error('Auto assign prefix not found, we just found it');
  }

  const formattedAutoAssignPrefix = autoAssignPrefix.trim().toLowerCase();

  // Remove the leading auto assign prefix from the description
  let descriptionNoPrefix = descriptionTrimmed.slice(formattedAutoAssignPrefix.length).trim();

  // If there is a hyphenated start eg "- " then remove that too
  if (descriptionNoPrefix.startsWith('-') || descriptionNoPrefix.startsWith(':')) {
    descriptionNoPrefix = descriptionNoPrefix.slice(1).trim();
  }

  return {
    match: true as const,
    timesheeterProject,
    trimmedDescription: descriptionNoPrefix,
    autoAssignPrefix,
  };
};
