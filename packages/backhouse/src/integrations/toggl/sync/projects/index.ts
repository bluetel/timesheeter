import { RawTogglProject } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import { EvaluatedProjectPair, ProjectPair, TimesheeterProject, TogglProject, createProjectPairs } from './data';
import {
  createTimesheeterProject,
  createTogglProject,
  deleteTimesheeterProject,
  deleteTogglProject,
  updateTimesheeterProject,
  updateTogglProject,
} from './mutations';

export const syncProjects = async ({
  context,
}: {
  context: TogglIntegrationContext;
}): Promise<EvaluatedProjectPair[]> => {
  const projectPairs = await createProjectPairs({ context });

  // As we update the timesheeter projects in the loop, we need to store the updated projects
  const updatedProjectPairs = [] as ProjectPair[];

  // Loop through all project pairs and create/update/delete projects as needed
  for (const projectPair of projectPairs) {
    const { togglProject, timesheeterProject } = projectPair;

    if (togglProject && timesheeterProject) {
      // If both are marked as deleted, skip
      if (togglProject.deleted && timesheeterProject.deleted) {
        updatedProjectPairs.push(projectPair);
        continue;
      }

      // If both projects exist, update the timesheeter project with the toggl project data
      if (!togglProject.deleted && !timesheeterProject.deleted) {
        // If both unchanged, skip
        if (projectsAreTheSame(togglProject, timesheeterProject)) {
          updatedProjectPairs.push(projectPair);
          continue;
        }

        // Check to see which project has been updated more recently, then copy the data from the newer project to the older one

        if (togglProject.at > timesheeterProject.updatedAt) {
          // Update the timesheeter project with the toggl project data

          updatedProjectPairs.push(await updateTimesheeterProject({ context, timesheeterProject, togglProject }));
          continue;
        }

        // Update the toggl project with the timesheeter project data
        updatedProjectPairs.push(await updateTogglProject({ context, timesheeterProject, togglProject }));
        continue;
      }

      // If the toggl project is deleted, delete the timesheeter project
      if (togglProject.deleted && !timesheeterProject.deleted) {
        updatedProjectPairs.push(await deleteTimesheeterProject({ context, togglProject }));
        continue;
      }

      // If the timesheeter project is deleted, delete the toggl project
      if (!togglProject.deleted && timesheeterProject.deleted) {
        updatedProjectPairs.push(await deleteTogglProject({ context, togglProject, timesheeterProject }));
        continue;
      }
    }

    // If only the toggl project exists and not deleted, create a new timesheeter project
    if (togglProject && !togglProject.deleted && !timesheeterProject) {
      updatedProjectPairs.push(await createTimesheeterProject({ context, togglProject }));
      continue;
    }

    // If only the timesheeter project exists, create a new toggl project
    if (!togglProject && timesheeterProject && !timesheeterProject.deleted) {
      updatedProjectPairs.push(await createTogglProject({ context, timesheeterProject }));
      continue;
    }

    console.warn('Unreachable code reached in syncProjects');
    updatedProjectPairs.push(projectPair);
  }

  // Ensure that all pairs have a toggl project and a timesheeter project
  return updatedProjectPairs
    .map((projectPair) => {
      if (projectPair.togglProject?.deleted === false && projectPair.timesheeterProject) {
        return projectPair as EvaluatedProjectPair;
      }

      return null;
    })
    .filter((projectPair): projectPair is EvaluatedProjectPair => !!projectPair);
};

export * from './data';

const projectsAreTheSame = (project1: RawTogglProject, project2: TimesheeterProject): boolean => {
  return project1.name === project2.name && BigInt(project1.id) === project2.togglProjectId;
};
