import { prisma, ParsedIntegration } from "@timesheeter/app";
import { getAxiosClient, getReportDataWorkspace, getWorkspaces } from "./api";
import { matchTaskRegex } from "@timesheeter/app";
import { type Project } from "@prisma/client";
import JiraApi from "jira-client";

type JiraIntegration = ParsedIntegration & {
    config: {
        type: "JiraIntegration";
    };
};

export const handleJiraIntegration = async ({ integration }: { integration: JiraIntegration }) => {
    const jiraClient = new JiraApi({
        protocol: "https",
        host: integration.config.host,
        username: integration.config.username,
        password: integration.config.apiKey,
        apiVersion: "2",
        strictSSL: true,
    });

    // only get most recent checkForUpdatesDays days in updatedAt
    const tasks = await prisma.task.findMany({
        where: {
            workspaceId: integration.workspaceId,
            createdAt: {
                gt: new Date(new Date().getTime() - integration.config.checkForUpdatesDays * 24 * 60 * 60 * 1000),
            },
        },
        include: {
            project: true,
        },
    });

    return Promise.all(
        tasks.map(async (task) => {
            const issueNumber = `${task.project?.taskPrefix}-${task.taskNumber}`;
            const jiraTicket = await jiraClient.findIssue(issueNumber);

            if (!jiraTicket) {
                return;
            }

            // Update task name if it has changed in Jira
            if (task.name === jiraTicket.fields.summary) {
                return;
            }

            return prisma.task.update({
                where: {
                    id: task.id,
                },
                data: {
                    name: jiraTicket.fields.summary,
                },
            });
        })
    );
};
