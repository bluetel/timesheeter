import dotenv from "dotenv";

dotenv.config();

import { type IntegrationJob, integrationsQueue, connectionConfig } from "@timesheeter/app";
import { type Job, Queue, RedisConnection, Worker } from "bullmq";

// const workerConfig = {
//     connection: (await import("@timesheeter/app")).connectionConfig,
//     concurrency: 50,
// } as const;

console.log("Starting Backhouse server...");

const integrationsWorker = new Worker<IntegrationJob, unknown>(
    "integrations",
    async (job) => {
        console.log("integrationsWorker: ", job.data);
    },
    {
        connection: connectionConfig,
    }
);
