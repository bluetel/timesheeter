import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { type IconType } from "react-icons/lib";
import { z } from "zod";

export const TIMESHEET_ENTRIES_HELP_TEXT =
  "Timesheet entries are the individual time periods that you spend on tasks" as const;

export const TimesheetEntryIcon = PencilSquareIcon as IconType;

export const TIMESHEET_ENTRY_DEFINITIONS = {
  DefaultTimesheetEntry: {
    name: "Timesheet Entry",
    fields: [],
    configSchema: z.object({
      type: z.literal("DefaultTimesheetEntry"),
    }),
    updateTimesheetEntrySchema: z.object({
      type: z.literal("DefaultTimesheetEntry"),
    }),
    defaultConfig: {
      type: "DefaultTimesheetEntry",
    },
  },
} as const;

export type TimesheetEntryType = keyof typeof TIMESHEET_ENTRY_DEFINITIONS;

export type TimesheetEntryDetail =
  (typeof TIMESHEET_ENTRY_DEFINITIONS)[TimesheetEntryType];

export const timesheetEntryConfigSchema =
  TIMESHEET_ENTRY_DEFINITIONS.DefaultTimesheetEntry.configSchema;

export type TimesheetEntryConfig = z.infer<typeof timesheetEntryConfigSchema>;

export const updateTimesheetEntryConfigSchema =
  TIMESHEET_ENTRY_DEFINITIONS.DefaultTimesheetEntry.updateTimesheetEntrySchema;

export type UpdateTimesheetEntryConfig = z.infer<
  typeof updateTimesheetEntryConfigSchema
>;

export const getDefaultTimesheetEntryConfig = (
  type: TimesheetEntryType = "DefaultTimesheetEntry"
) => TIMESHEET_ENTRY_DEFINITIONS[type].defaultConfig;
