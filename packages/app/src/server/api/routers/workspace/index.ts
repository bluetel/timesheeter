import { createTRPCRouter } from "@timesheeter/app/server/api/trpc";
import { integrationsRouter } from "./integrations";
import { projectsRouter } from "./projects";
import { holidaysRouter } from "./holidays";
import { timesheetEntriesRouter } from "./timesheet-entries";
import { tasksRouter } from "./tasks";

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  timesheetEntries: timesheetEntriesRouter,
  holidays: holidaysRouter,
});

export * from "./integrations";
export * from "./projects";
export * from "./tasks";
export * from "./timesheet-entries";
export * from "./holidays";
