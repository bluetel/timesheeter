import { prisma, ParsedIntegration } from "@timesheeter/app";
import { getAxiosClient, getReportDataWorkspace, getWorkspaces } from "./api";

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

    const axiosClient = getAxiosClient({ apiKey: integration.config.apiKey });
    const workspaces = await getWorkspaces({ axiosClient });

    const timeNow = new Date();
    const since = new Date(timeNow.getTime() - 30 * 24 * 60 * 60 * 1000);

    const reportData = await Promise.all(
        workspaces.map((workspace) =>
            getReportDataWorkspace({
                axiosClient,
                workspaceId: workspace.id,
                // Go back 30 days
                since: since.toISOString(),
                until: timeNow.toISOString(),
            })
        )
    ).then((results) => results.flat());
};
