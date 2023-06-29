import dotenv from "dotenv";
dotenv.config();

import { type IntegrationJob, connectionConfig } from "@timesheeter/app";
import { Worker } from "bullmq";
import { handleIntegrationsJob } from "@timesheeter/backhouse/integrations";

console.log("Starting Backhouse Worker");

const worker = new Worker<IntegrationJob, unknown>("integrations", handleIntegrationsJob, {
    connection: connectionConfig,
});

// Error handler is required to prevent unhandled errors from crashing the worker
worker.on("error", (error) => {
    // log the error
    console.error("Error in worker", error);
});
