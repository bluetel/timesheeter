import { encrypt, getDefaultProjectConfig, type MatchedTaskResult, parseProject } from '@timesheeter/web';
import { type TogglIntegrationContext } from '../../lib';
import { type TimesheeterProject, timesheeterProjectSelectQuery } from '../../sync';
import { type RawTogglProject, type RawTogglTask } from '../../api';

export const handleTaskPrefixMatch = async ({
  context,
  matchResult,
  timesheeterProjects,
  togglProject,
}: {
  context: TogglIntegrationContext;
  matchResult: MatchedTaskResult & {
    variant: 'jira-based';
  };
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  togglTasks: RawTogglTask[];
  togglProject: RawTogglProject;
}) => {
  let updatedTimesheeterProjects = timesheeterProjects;

  // See if any existing timesheeter projects match the task prefix
  const existingTimesheeterProject = timesheeterProjects.find(({ togglProjectId }) =>
    togglProjectId ? Number(togglProjectId) === togglProject.id : false
  );

  if (existingTimesheeterProject) {
    // Check if the task prefix is already in the project config
    const existingPrefix = existingTimesheeterProject.config.taskPrefixes.find(
      (prefix) => prefix === matchResult.prefix
    );

    if (!existingPrefix) {
      // Add the task prefix to the project config
      const updatedConfig = {
        ...existingTimesheeterProject.config,
        taskPrefixes: [...existingTimesheeterProject.config.taskPrefixes, matchResult.prefix],
      };

      const updatedTimesheeterProject = await context.prisma.project
        .update({
          where: { id: existingTimesheeterProject.id },
          data: {
            configSerialized: encrypt(JSON.stringify(updatedConfig)),
            taskPrefixes: {
              create: [
                {
                  prefix: matchResult.prefix,
                  workspaceId: context.workspaceId,
                },
              ],
            },
          },
          select: timesheeterProjectSelectQuery,
        })
        .then((project) => parseProject(project, false));

      updatedTimesheeterProjects = updatedTimesheeterProjects.map((project) =>
        project.id === updatedTimesheeterProject.id ? updatedTimesheeterProject : project
      );
    }

    return {
      matchedProject: togglProject,
      taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
      updatedTimesheeterProjects,
    };
  }

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
    taskName: `${matchResult.prefix}-${matchResult.taskNumber}`,
    updatedTimesheeterProjects,
  };
};
