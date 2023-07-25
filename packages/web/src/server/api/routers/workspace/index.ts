import { createTRPCRouter } from '@timesheeter/web/server/api/trpc';
import { integrationsRouter } from './integrations';
import { projectsRouter } from './projects';
import { holidaysRouter } from './holidays';
import { timesheetEntriesRouter } from './timesheet-entries';
import { tasksRouter } from './tasks';
import { managementRouter } from './management';

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  timesheetEntries: timesheetEntriesRouter,
  holidays: holidaysRouter,
  management: managementRouter,
});

export * from './integrations';
export * from './projects';
export * from './tasks';
export * from './timesheet-entries';
export * from './holidays';
export * from './management';
