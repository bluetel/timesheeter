import dotenv from "dotenv";
dotenv.config();

import { type IntegrationJob, connectionConfig } from "@timesheeter/app";
import { Job, Worker } from "bullmq";
import { handleIntegrationsJob } from "@timesheeter/backhouse/integrations";

export const integrationsWorker = new Worker<IntegrationJob, unknown>("integrations", handleIntegrationsJob, {
    connection: connectionConfig,
});
