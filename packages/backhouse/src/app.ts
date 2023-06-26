import dotenv from "dotenv";
dotenv.config();

import { type IntegrationJob, connectionConfig, prisma, parseIntegration } from "@timesheeter/app";
import { Job, Worker } from "bullmq";
import { handleIntegrationsJob } from "@timesheeter/backhouse/integrations";
import { handleTogglIntegration } from "./integrations/toggl";
import { handleJiraIntegration } from "./integrations/jira";
import { handleGoogleSheetsIntegration } from "./integrations/google-sheets";

console.log("Starting backhouse worker");

// new Worker<IntegrationJob, unknown>("integrations", handleIntegrationsJob, {
//     connection: connectionConfig,
// });

const handleTest = async () => {
    const integrations = await prisma.integration
        .findMany()
        .then((integrations) => integrations.map((integration) => parseIntegration(integration, false)));

    // FInd toggle integration
    const togglIntegration = integrations.find((integration) => integration.config.type === "TogglIntegration");

    if (!togglIntegration || togglIntegration.config.type !== "TogglIntegration") {
        throw new Error("No toggl integration found");
    }

    const jiraIntegration = integrations.find((integration) => integration.config.type === "JiraIntegration");

    if (!jiraIntegration || jiraIntegration.config.type !== "JiraIntegration") {
        throw new Error("No jira integration found");
    }

    const googleSheetsIntegration = integrations.find(
        (integration) => integration.config.type === "GoogleSheetsIntegration"
    );

    if (!googleSheetsIntegration || googleSheetsIntegration.config.type !== "GoogleSheetsIntegration") {
        throw new Error("No google sheets integration found");
    }

    // await handleTogglIntegration({
    //     integration: {
    //         ...togglIntegration,
    //         config: togglIntegration.config,
    //     },
    // });

    // await handleJiraIntegration({
    //     integration: {
    //         ...jiraIntegration,
    //         config: jiraIntegration.config,
    //     },
    // });

    await handleGoogleSheetsIntegration({
        integration: {
            ...googleSheetsIntegration,
            config: googleSheetsIntegration.config,
        },
    });
};

const deleteAllProjects = async () => {
    // await prisma.project.deleteMany();
    await prisma.task.deleteMany();
    console.log("Deleted all projects");
};

// deleteAllProjects().then(() => {
//     handleTest();
// });

handleTest();
