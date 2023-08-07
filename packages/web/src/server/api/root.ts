import { createTRPCRouter } from '@timesheeter/web/server/api/trpc';
import { workspaceRouter, devToolsRouter } from './routers';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  devTools: devToolsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
