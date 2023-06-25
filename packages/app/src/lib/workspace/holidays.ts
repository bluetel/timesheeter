import { z } from "zod";
import { type IconType } from "react-icons";
import { GlobeEuropeAfricaIcon } from "@heroicons/react/24/outline";

export const HOLIDAYS_HELP_TEXT =
  "Holiday entries will be automatically added to your timesheet" as const;

export const HolidayIcon = GlobeEuropeAfricaIcon as IconType;

export const createHolidaySchema = z.object({
  workspaceId: z.string().cuid2(),
  description: z.string().min(1).max(100).nullable(),
  start: z.date(),
  end: z.date(),
});

export const updateHolidaySchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  description: z.string().min(1).max(100).nullable().optional(),
  start: z.date().optional(),
  end: z.date().optional(),
});
