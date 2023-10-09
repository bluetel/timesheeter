import { type RawTogglProject, type RawTogglTimeEntry } from '../../api';
import { type TimesheeterProject } from '../../sync';

export const handleNoDescription = async ({
  togglProjects,
  timesheeterProjects,
  uncategorizedTasksProject,
  timeEntry,
}: {
  togglProjects: RawTogglProject[];
  timesheeterProjects: TimesheeterProject[];
  uncategorizedTasksProject: RawTogglProject;
  timeEntry: RawTogglTimeEntry;
}) => {
  const parentProject = togglProjects.find((project) => project.id === timeEntry.project_id);

  const projectToUse = parentProject ?? uncategorizedTasksProject;

  return {
    matchedProject: projectToUse,
    updatedTogglProjects: togglProjects,
    updatedTimesheeterProjects: timesheeterProjects,
    taskName: 'Uncategorized',
    autoAssignTrimmedDescription: null,
  };
};
