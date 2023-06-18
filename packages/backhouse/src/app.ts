import dotenv from "dotenv";
dotenv.config();

import { type IntegrationJob, connectionConfig, prisma } from "@timesheeter/app";
import { Job, Worker } from "bullmq";
import { handleIntegrationsJob } from "@timesheeter/backhouse/integrations";

console.log("Starting Backhouse server...");

prisma.integration
    .findMany({
        where: {
            createdAt: {
                gt: new Date(0),
            },
        },
    })
    .then((integrations) => {
        integrations.map((integration) => {
            console.log("Scheduling integration", integration.id);

            const jobConfig = {
                data: { integrationId: integration.id },
            };

            handleIntegrationsJob(jobConfig as unknown as Job<IntegrationJob>);
        });
    });

export const integrationsWorker = new Worker<IntegrationJob, unknown>("integrations", handleIntegrationsJob, {
    connection: connectionConfig,
});
