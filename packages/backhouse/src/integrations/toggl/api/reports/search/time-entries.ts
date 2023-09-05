import { isoStringRegex } from '@timesheeter/web/lib';
import { API_BASE_URL, RateLimitedAxiosClient } from '../../client';
import { z } from 'zod';
import { RawTogglTimeEntry } from '../../time-entries';

const reportTimeEntry = z.object({
  user_id: z.number().int().positive(),
  description: z.string().nullable(),
  project_id: z.number().int().positive().nullable(),
  task_id: z.number().int().positive().nullable(),
  billable: z.boolean(),
  time_entries: z
    .object({
      id: z.number().int().positive(),
      start: z.string(),
      stop: z.string().nullable(),
      /** Updated at */
      at: z.string(),
    })
    .transform((data) => ({
      ...data,
      at: new Date(data.at),
    }))
    .array(),
});

const reportTimeEntryArraySchema = reportTimeEntry.array();

const minimalTimeEntryQuerySchema = z.object({
  start_date: z.string().regex(isoStringRegex),
  end_date: z.string().regex(isoStringRegex),
  grouped: z.boolean().optional(),
  hide_amounts: z.boolean().optional(),
  hide_rates: z.boolean().optional(),
});

const pageSize = 1000;

const formatDate = (date: Date) => {
  // Add one more day to the end date so we get all time entries for the end date
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// add default grouped and hide_amounts
const reportTimeEntryQuerySchema = minimalTimeEntryQuerySchema.transform((data) => {
  const startDate = new Date(data.end_date);
  const endDate = new Date(data.end_date);

  return {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    first_row_number: null,
    grouped: data.grouped ?? false,
    hide_amounts: data.hide_amounts ?? true,
    hide_rates: data.hide_rates ?? true,
    order_by: 'date',
    order_desc: 'asc',
    page_size: pageSize,
  };
});

/** https://developers.track.toggl.com/docs/reports/detailed_reports/index.html */
export const reportTimeEntries = async ({
  axiosClient,
  path,
  query,
}: {
  axiosClient: RateLimitedAxiosClient;
  path: {
    workspace_id: number;
  };
  query: z.infer<typeof minimalTimeEntryQuerySchema>;
}) => {
  let rawTogglTimeEntries: RawTogglTimeEntry[] = [];
  let startDate = new Date(query.start_date);
  const endDate = new Date(query.end_date);

  while (startDate <= endDate) {
    const nextDate = new Date(startDate);
    nextDate.setUTCDate(startDate.getUTCDate() + 1); // Increment by one day

    const currentQuery = {
      ...query,
      start_date: startDate.toISOString(),
      end_date: nextDate.toISOString(),
    };

    const parsedQuery = reportTimeEntryQuerySchema.parse(currentQuery);

    const response = await axiosClient.post(
      `${API_BASE_URL}/reports/api/v3/workspace/${path.workspace_id}/search/time_entries`,
      parsedQuery
    );

    const reportTimeEntries = reportTimeEntryArraySchema.parse(response.data);

    // If results count is 50 throw an error
    if (reportTimeEntries.length === pageSize) {
      throw new Error(
        `Toggl API returned ${pageSize} time entries for the date range ${currentQuery.start_date} - ${currentQuery.end_date}. This is the maximum number of time entries that can be returned. Please narrow down the date range.`
      );
    }

    for (const reportTimeEntry of reportTimeEntries) {
      if (!reportTimeEntry.time_entries[0]) {
        continue;
      }

      const innerData = reportTimeEntry.time_entries[0];

      rawTogglTimeEntries.push({
        id: innerData.id,
        start: innerData.start,
        stop: innerData.stop,
        at: innerData.at,
        task_id: reportTimeEntry.task_id,
        project_id: reportTimeEntry.project_id,
        user_id: reportTimeEntry.user_id,
        description: reportTimeEntry.description,
        workspace_id: path.workspace_id,
        billable: reportTimeEntry.billable,
      });
    }

    startDate = nextDate;
  }

  // Filter out duplicate time entries and return
  return rawTogglTimeEntries.filter((timeEntry, index, self) => self.findIndex((t) => t.id === timeEntry.id) === index);
};
