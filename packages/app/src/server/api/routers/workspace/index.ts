import { createTRPCRouter } from "@timesheeter/app/server/api/trpc";
import { integrationsRouter } from "./integrations";
import { connectorsRouter } from "./connectors";

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
  connectors: connectorsRouter,
});

export * from "./integrations";
export * from "./connectors";
