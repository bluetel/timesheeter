import {
    prisma,
    ParsedIntegration,
    encrypt,
    getDefaultTimesheetEntryConfig,
    getDefaultTaskConfig,
    ParsedProject,
    parseProject,
    getDefaultProjectConfig,
} from "@timesheeter/app";
import { getAxiosClient, getReportDataWorkspace, getWorkspaces } from "./api";
import { matchTaskRegex } from "@timesheeter/app";

type TogglIntegration = ParsedIntegration & {
    config: {
        type: "TogglIntegration";
    };
};

export const handleTogglIntegration = async ({ integration }: { integration: TogglIntegration }) => {
    const reportData = await getReportData({ integration });

    const projects = await prisma.project
        .findMany({
            where: {
                workspaceId: integration.workspaceId,
            },
        })
        .then((projects) => projects.map((project) => parseProject(project, false)));

    // Handle this synchronously, so duplicate tasks don't get created

    for (const entry of reportData) {
        if (!entry.description) {
            continue;
        }

        const { task, timesheetDescription } = await getOrCreateTask({
            integration,
            description: entry.description,
            projects,
        });

        // See if there is an existing entry for this task
        const existingEntry = await prisma.timesheetEntry.findFirst({
            where: {
                workspaceId: integration.workspaceId,
                taskId: task.id,
                userId: integration.userId,
                togglTimesheetEntryId: entry.id,
            },
        });

        if (existingEntry) {
            await prisma.timesheetEntry.update({
                where: {
                    id: existingEntry.id,
                },
                data: {
                    description: timesheetDescription,
                    start: entry.start,
                    end: entry.end,
                },
            });

            continue;
        }

        await prisma.timesheetEntry.create({
            data: {
                workspaceId: integration.workspaceId,
                taskId: task.id,
                userId: integration.userId,
                start: entry.start,
                end: entry.end,
                description: timesheetDescription,
                togglTimesheetEntryId: entry.id,
                configSerialized: encrypt(JSON.stringify(getDefaultTimesheetEntryConfig())),
            },
        });
    }
};

const getReportData = async ({ integration }: { integration: TogglIntegration }) => {
    const axiosClient = getAxiosClient({ apiKey: integration.config.apiKey });
    const workspaces = await getWorkspaces({ axiosClient });

    const timeNow = new Date();
    // Use a days lag so if entries are modified on the same day, we don't miss updates
    const until = new Date(timeNow.getTime() - 1 * 24 * 60 * 60 * 1000);
    const since = new Date(timeNow.getTime() - 40 * 24 * 60 * 60 * 1000);

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
    projects: ParsedProject[];
}) => {
    const matchResult = matchTaskRegex(description);

    if (matchResult.variant === "with-task") {
        let project = projects.find(({ taskPrefix }) => taskPrefix === matchResult.prefix);

        if (!project) {
            project = await prisma.project
                .findFirst({
                    where: {
                        workspaceId: integration.workspaceId,
                        taskPrefix: matchResult.prefix,
                    },
                })
                .then((project) => (project ? parseProject(project, false) : undefined));
        }

        if (!project) {
            project = (await prisma.project
                .create({
                    data: {
                        workspaceId: integration.workspaceId,
                        name: `Auto created from Toggl - ${matchResult.prefix}`,
                        taskPrefix: matchResult.prefix,
                        configSerialized: encrypt(JSON.stringify(getDefaultProjectConfig())),
                    },
                })
                .then((project) => parseProject(project, false))) as ParsedProject;
        }

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
                    configSerialized: encrypt(JSON.stringify(getDefaultTaskConfig())),
                },
            });
        }

        return { task, timesheetDescription: matchResult.description };
    }

    // Update a task not assigned to a project

    // See if matches any auto assignable tasks
    let autoAssignProject = projects.find(({ config: { autoAssignTasks } }) => {
        if (!autoAssignTasks) {
            return;
        }

        const descriptionLowercase = description.toLowerCase();

        for (const matchTerm of autoAssignTasks) {
            if (descriptionLowercase.startsWith(matchTerm.toLowerCase())) {
                return true;
            }
        }
    });

    let task = await prisma.task.findFirst({
        where: {
            name: description,
            workspaceId: integration.workspaceId,
        },
    });

    if (!task) {
        task = await prisma.task.create({
            data: {
                name: description,
                workspaceId: integration.workspaceId,
                projectId: autoAssignProject?.id ?? null,
                configSerialized: encrypt(JSON.stringify(getDefaultTaskConfig())),
            },
        });
    }

    return { task, timesheetDescription: null };
};
