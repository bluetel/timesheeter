import { type IntegrationJob, parseIntegration, prisma } from "@timesheeter/app";
import { type Job } from "bullmq";
import { handleTogglIntegration } from "./toggl";
import { handleJiraIntegration } from "./jira";

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
        integration.config;
        await handleTogglIntegration({
            integration: {
                ...integration,
                config: integration.config,
            },
        });
    } else if (integration.config.type === "JiraIntegration") {
        await handleJiraIntegration({
            integration: {
                ...integration,
                config: integration.config,
            },
        });
    }
};
