import { createNextApiHandler } from "@trpc/server/adapters/next";

import { env } from "@timesheeter/app/env.mjs";
import { createTRPCContext } from "@timesheeter/app/server/api/trpc";
import { appRouter } from "@timesheeter/app/server/api/root";

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
          );
        }
      : undefined,
});
