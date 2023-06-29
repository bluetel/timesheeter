import { type IntegrationJob, parseIntegration, prisma } from "@timesheeter/app";
import { type Job } from "bullmq";
import { handleTogglIntegration } from "./toggl";
import { handleJiraIntegration } from "./jira";
import { handleGoogleSheetsIntegration } from "./google-sheets";

export const handleIntegrationsJob = async (job: Job<IntegrationJob, unknown>) => {
    const { integrationId } = job.data;

    console.log("Processing integration", integrationId);

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
    } else if (integration.config.type === "GoogleSheetsIntegration") {
        await handleGoogleSheetsIntegration({
            integration: {
                ...integration,
                config: integration.config,
            },
        });
    }
};
