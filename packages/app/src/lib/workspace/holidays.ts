import { z } from "zod";
import { ukDateRegex } from "@timesheeter/app/lib/regex";
import { type IconType } from "react-icons";
import { GlobeEuropeAfricaIcon } from "@heroicons/react/24/outline";

export const HOLIDAYS_HELP_TEXT =
  "Holiday entries will be automatically added to your timesheet" as const;

export const HolidayIcon = GlobeEuropeAfricaIcon as IconType;

export const createHolidaySchema = z.object({
  workspaceId: z.string().cuid2(),
  description: z.string().min(1).max(100),
  start: z.string().regex(ukDateRegex),
  end: z.string().regex(ukDateRegex),
});

export const updateHolidaySchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  description: z.string().min(1).max(100).optional(),
  start: z.string().regex(ukDateRegex).optional(),
  end: z.string().regex(ukDateRegex).optional(),
});
