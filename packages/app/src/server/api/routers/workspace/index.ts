import { createTRPCRouter } from "@timesheeter/app/server/api/trpc";
import { integrationsRouter } from "./integrations";

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
});

export * from "./integrations";
