import dotenv from "dotenv";
dotenv.config();

import { type IntegrationJob, connectionConfig } from "@timesheeter/app";
import { Worker } from "bullmq";
import { handleIntegrationsJob } from "@timesheeter/backhouse/integrations";

// const workerConfig = {
//     connection: (await import("@timesheeter/app")).connectionConfig,
//     concurrency: 50,
// } as const;

console.log("Starting Backhouse server...");

export const integrationsWorker = new Worker<IntegrationJob, unknown>("integrations", handleIntegrationsJob, {
    connection: connectionConfig,
});
