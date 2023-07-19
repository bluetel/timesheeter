import { timeEntriesGet, timeEntriesPost, timeEntriesPut } from './time-entries';
import { tasksGet, tasksPost, tasksPut } from './tasks';
import { tagsGet, tagsPost, tagsPut } from './tags';
import { projectsGet, projectsPost, projectsPut } from './projects';
import { meGet } from './me';

export const toggl = {
  timeEntries: {
    get: timeEntriesGet,
    post: timeEntriesPost,
    put: timeEntriesPut,
  },
  tasks: {
    get: tasksGet,
    post: tasksPost,
    put: tasksPut,
  },
  tags: {
    get: tagsGet,
    post: tagsPost,
    put: tagsPut,
  },
  projects: {
    get: projectsGet,
    post: projectsPost,
    put: projectsPut,
  },
  me: {
    get: meGet,
  },
};

export * from './client';
