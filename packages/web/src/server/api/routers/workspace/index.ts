import { createTRPCRouter } from "@timesheeter/web/server/api/trpc";
import { integrationsRouter } from "./integrations";
import { projectsRouter } from "./projects";
import { holidaysRouter } from "./holidays";
import { timesheetEntriesRouter } from "./timesheet-entries";
import { tasksRouter } from "./tasks";
import { managementRouter } from "./management";
import { adminToolsRouter } from "./admin";
import { taskPrefixesRouter } from "./task-prefixes";
import { monthlyTimeRouter } from "./monthly-time";

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
  projects: projectsRouter,
  taskPrefixes: taskPrefixesRouter,
  tasks: tasksRouter,
  timesheetEntries: timesheetEntriesRouter,
  holidays: holidaysRouter,
  management: managementRouter,
  adminTools: adminToolsRouter,
  monthlyTime: monthlyTimeRouter,
});

export * from "./integrations";
export * from "./projects";
export * from "./task-prefixes";
export * from "./tasks";
export * from "./timesheet-entries";
export * from "./holidays";
export * from "./management";
export * from "./monthly-time";
