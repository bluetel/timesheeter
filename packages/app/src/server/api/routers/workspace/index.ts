import { createTRPCRouter } from "@timesheeter/app/server/api/trpc";
import { integrationsRouter } from "./integrations";
import { modelsRouter } from "./models";
import { toolsRouter } from "./tools";
import { connectorsRouter } from "./connectors";

export const workspaceRouter = createTRPCRouter({
  integrations: integrationsRouter,
  models: modelsRouter,
  tools: toolsRouter,
  connectors: connectorsRouter,
});
