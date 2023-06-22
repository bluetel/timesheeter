import { createTRPCRouter } from "@timesheeter/app/server/api/trpc";
import { integrationsRouter } from "./integrations";
import { projectsRouter } from "./projects";
import { holidaysRouter } from "./holidays";

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
  projects: projectsRouter,
  holidays: holidaysRouter,
});

export * from "./integrations";
export * from "./projects";
export * from "./holidays";
