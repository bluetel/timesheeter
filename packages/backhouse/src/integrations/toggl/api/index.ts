import { timeEntriesGet, timeEntriesPost, timeEntriesPut } from './time-entries';
import { tasksGet, tasksPost, tasksPut } from './tasks';
import { tagsGet, tagsPost, tagsPut } from './tags';
import { projectsGet, projectsPost, projectsPut } from './projects';
import { meGet } from './me';
import { usersGet } from './users';

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
  users: {
    get: usersGet,
  },
};

export * from './client';
export * from './projects';
export * from './tags';
export * from './tasks';
export * from './time-entries';
export * from './me';
export * from './users';
