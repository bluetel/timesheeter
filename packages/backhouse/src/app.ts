import dotenv from "dotenv";
dotenv.config();

import { type IntegrationJob, connectionConfig } from "@timesheeter/app";
import { Worker, Queue } from "bullmq";
import { handleIntegrationsJob } from "@timesheeter/backhouse/integrations";

console.log("Starting Backhouse Worker");

console.log("Connecting to Redis", connectionConfig);

const worker = new Worker<IntegrationJob, unknown>("integrations", handleIntegrationsJob, {
    connection: connectionConfig,
});

const queue = new Queue<IntegrationJob, unknown>("integrations", {
    connection: connectionConfig,
});

console.log("Worker started, existing jobs", queue.getJobs());

// Error handler is required to prevent unhandled errors from crashing the worker
worker.on("error", (error) => {
    // log the error
    console.error("Error in worker", error);
});
