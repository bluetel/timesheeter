import { createTRPCRouter } from '@timesheeter/web/server/api/trpc';
import { integrationsRouter } from './integrations';
import { projectsRouter } from './projects';
import { holidaysRouter } from './holidays';
import { timesheetEntriesRouter } from './timesheet-entries';
import { membershipsRouter } from './memberships';
import { tasksRouter } from './tasks';

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  timesheetEntries: timesheetEntriesRouter,
  holidays: holidaysRouter,
  memberships: membershipsRouter,
});

export * from './integrations';
export * from './projects';
export * from './tasks';
export * from './timesheet-entries';
export * from './holidays';
export * from './memberships';
