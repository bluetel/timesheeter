import { prisma, ParsedIntegration } from "@timesheeter/app";
import { getAxiosClient, getReportDataWorkspace, getWorkspaces } from "./api";
import { matchTaskRegex } from "@timesheeter/app";
import { type Project } from "@prisma/client";

type TogglIntegration = ParsedIntegration & {
    config: {
        type: "TogglIntegration";
    };
};

export const handleTogglIntegration = async ({ integration }: { integration: TogglIntegration }) => {
    const projects = await prisma.project.findMany({
        where: {
            workspaceId: integration.workspaceId,
        },
    });

    const reportData = await getReportData({ integration });

    return Promise.all(
        reportData.map(async (entry) => {
            if (!entry.description) {
                return;
            }

            const task = await getOrCreateTask({ integration, description: entry.description, projects });

            return prisma.timesheetEntry.create({
                data: {
                    workspaceId: integration.workspaceId,
                    taskId: task.id,
                    userId: integration.userId,
                    start: entry.start,
                    end: entry.stop,
                    description: entry.description,
                },
            });
        })
    );
};

const getReportData = async ({ integration }: { integration: TogglIntegration }) => {
    const axiosClient = getAxiosClient({ apiKey: integration.config.apiKey });
    const workspaces = await getWorkspaces({ axiosClient });

    const timeNow = new Date();
    const until = new Date(timeNow.getTime() + 1 * 24 * 60 * 60 * 1000);
    const since = new Date(timeNow.getTime() - 30 * 24 * 60 * 60 * 1000);

    return Promise.all(
        workspaces.map((workspace) =>
            getReportDataWorkspace({
                axiosClient,
                workspaceId: workspace.id,
                since: since.toISOString(),
                until: until.toISOString(),
            })
        )
    ).then((results) => results.flat());
};

const getOrCreateTask = async ({
    integration,
    description,
    projects,
}: {
    integration: TogglIntegration;
    description: string;
    projects: Project[];
}) => {
    // See if description starts with a task
    const matchResult = matchTaskRegex(description);

    if (matchResult.variant === "task") {
        const project = projects.find(({ taskPrefix }) => taskPrefix === matchResult?.prefix);

        if (project) {
            // Update a task assigned to a project
            let task = await prisma.task.findFirst({
                where: {
                    workspaceId: integration.workspaceId,
                    projectId: project.id,
                    taskNumber: matchResult.taskNumber,
                },
            });

            if (!task) {
                task = await prisma.task.create({
                    data: {
                        workspaceId: integration.workspaceId,
                        projectId: project.id,
                        taskNumber: matchResult.taskNumber,
                        name: matchResult.description,
                    },
                });
            }

            return task;
        }
    }

    // Update a task not assigned to a project

    let task = await prisma.task.findFirst({
        where: {
            name: description,
            projectId: null,
            workspaceId: integration.workspaceId,
        },
    });

    if (!task) {
        task = await prisma.task.create({
            data: {
                name: description,
                workspaceId: integration.workspaceId,
            },
        });
    }

    return task;
};
