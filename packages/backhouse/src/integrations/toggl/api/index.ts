import { timeEntriesDelete, timeEntriesGet, timeEntriesPost, timeEntriesPut } from './time-entries';
import { tasksDelete, tasksGet, tasksPost, tasksPut } from './tasks';
import { tagsGet, tagsPost, tagsPut } from './tags';
import { projectsDelete, projectsGet, projectsPost, projectsPut } from './projects';
import { meGet } from './me';
import { usersGet } from './users';

export const toggl = {
  timeEntries: {
    get: timeEntriesGet,
    post: timeEntriesPost,
    put: timeEntriesPut,
    delete: timeEntriesDelete,
  },
  tasks: {
    get: tasksGet,
    post: tasksPost,
    put: tasksPut,
    delete: tasksDelete,
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
    delete: projectsDelete,
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
