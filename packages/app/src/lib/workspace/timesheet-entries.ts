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

export const createTimesheetEntrySchema = z.object({
  workspaceId: z.string().cuid2(),
  taskId: z.string().cuid2(),
  start: z.date(),
  end: z.date(),
  description: z.string().min(1).max(100).nullable(),
  config: timesheetEntryConfigSchema,
});

export const updateTimesheetEntrySchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  taskId: z.string().cuid2().optional(),
  start: z.date().optional(),
  end: z.date().optional(),
  description: z.string().min(1).max(100).nullable().optional(),
  config: updateTimesheetEntryConfigSchema,
});
