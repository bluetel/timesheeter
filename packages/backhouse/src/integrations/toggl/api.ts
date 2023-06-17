import axios from "axios";
import { z } from "zod";
import rateLimit from "axios-rate-limit";

const API_BASE_URL = "https://api.track.toggl.com";

export const getAxiosClient = ({ apiKey }: { apiKey: string }) =>
    rateLimit(
        axios.create({
            baseURL: API_BASE_URL,
            headers: {
                Authorization: `Basic ${Buffer.from(`${apiKey}:api_token`).toString("base64")}`,
                "Content-Type": "application/json",
            },
        }),
        { maxRequests: 1, perMilliseconds: 1500 }
    );

type RateLimitedAxiosClient = ReturnType<typeof getAxiosClient>;

const workspacesResponseSchema = z
    .object({
        id: z.number(),
    })
    .array();

export const getWorkspaces = async ({ axiosClient }: { axiosClient: RateLimitedAxiosClient }) => {
    const response = await axiosClient.get(`${API_BASE_URL}/api/v8/workspaces`);
    return workspacesResponseSchema.parse(response.data);
};

const updateEntryDescription = async ({
    axiosClient,
    entryId,
    description,
}: {
    axiosClient: RateLimitedAxiosClient;
    entryId: number;
    description: string;
}) => {
    await axiosClient.put(`${API_BASE_URL}/api/v8/time_entries/${entryId}`, {
        time_entry: {
            description,
        },
    });
};

const reportResponseSchema = z.object({
    per_page: z.number(),
    total_count: z.number(),
    data: z
        .object({
            // string or null
            description: z.string().nullable(),

            start: z.string(),
            stop: z.string(),
            billable: z.boolean(),
        })
        .array(),
});

type ReportData = z.infer<typeof reportResponseSchema>["data"][number];

export const getReportDataWorkspace = async ({
    axiosClient,
    workspaceId,
    since,
    until,
}: {
    axiosClient: RateLimitedAxiosClient;
    workspaceId: number;
    since: string;
    until: string;
}) => {
    let page = 1;
    let per_page: number | null = null;
    let total_count: number | null = null;

    const reportData: ReportData[] = [];

    do {
        const response = await axiosClient.get(`${API_BASE_URL}/reports/api/v2/details`, {
            params: {
                workspace_id: workspaceId,
                since,
                until,
                page: 1,
                order_field: "date",
                user_agent: "timesheeter",
            },
        });

        const reportResponse = reportResponseSchema.parse(response.data);
        reportData.push(...reportResponse.data);

        per_page = reportResponse.per_page;
        total_count = reportResponse.total_count;
        page += 1;
    } while (page * per_page < total_count && total_count > per_page);

    return reportData;
};
