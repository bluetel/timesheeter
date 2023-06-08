import { type IntegrationJob, parseIntegration, prisma } from "@timesheeter/app";
import { type Job } from "bullmq";
import { handleTogglIntegration } from "./toggl";

export const handleIntegrationsJob = async (job: Job<IntegrationJob, unknown>) => {
    const { integrationId } = job.data;

    const integration = await prisma.integration
        .findUnique({
            where: {
                id: integrationId,
            },
        })
        .then((integration) => {
            if (!integration) {
                throw new Error(`Integration with id ${integration} not found`);
            }

            return parseIntegration(integration, false);
        });

    if (integration.config.type === "TogglIntegration") {
        await handleTogglIntegration({ integration });
    }
};
