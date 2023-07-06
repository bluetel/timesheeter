import { RectangleStackIcon } from "@heroicons/react/24/outline";
import { type IconType } from "react-icons/lib";
import { z } from "zod";

export const TASKS_HELP_TEXT =
  "Tasks group timesheet entries together, they can have assigned numbers e.g. from Jira" as const;

export const TaskIcon = RectangleStackIcon as IconType;

export const TASK_DEFINITIONS = {
  DefaultTask: {
    name: "Task",
    fields: [],
    configSchema: z.object({
      type: z.literal("DefaultTask"),
    }),
    updateTaskSchema: z.object({
      type: z.literal("DefaultTask"),
    }),
    defaultConfig: {
      type: "DefaultTask",
    },
  },
} as const;

export type TaskType = keyof typeof TASK_DEFINITIONS;

export type TaskDetail = (typeof TASK_DEFINITIONS)[TaskType];

export const taskConfigSchema = TASK_DEFINITIONS.DefaultTask.configSchema;

export type TaskConfig = z.infer<typeof taskConfigSchema>;

export const updateTaskConfigSchema =
  TASK_DEFINITIONS.DefaultTask.updateTaskSchema;

export type UpdateTaskConfig = z.infer<typeof updateTaskConfigSchema>;

export const getDefaultTaskConfig = (type: TaskType = "DefaultTask") =>
  TASK_DEFINITIONS[type].defaultConfig;

export const createTaskSchema = z.object({
  workspaceId: z.string().cuid2(),
  taskNumber: z.number().int().positive().nullable(),
  name: z.string().min(1).max(100).nullable(),
  projectId: z.string().cuid2().nullable(),
  config: taskConfigSchema,
});

export const updateTaskSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  taskNumber: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(100).nullable().optional(),
  projectId: z.string().cuid2().nullable().optional(),
  config: updateTaskConfigSchema,
});

type MatchedTaskResult =
  | {
      variant: "with-task";
      prefix: string;
      taskNumber: number;
      description: string | null;
    }
  | {
      variant: "no-task";
      description: string;
    };

// 2 captial letters, followed by a dash, followed by 1 or more numbers, it can have additional text after the numbers if there is a hypen surrounded by spaces

// eg AC-1234 - Test description

// Prefix 1-8 letters (eg AC) or null if there is no prefix
// Task number (eg 1234) or null if there is no task number

// description (eg Test description) or null if there is no description

const taskRegex = /^([A-Z]{1,8})-([0-9]+)(?:\s-\s(.+))?$/;

export const matchTaskRegex = (rawDescription: string): MatchedTaskResult => {
  // See if description starts with a task
  // Convert the first 2 letters to uppercase and join wqith rest in case the task prefix has
  // accidentially been entered in lowercase
  const capitalizedDescription = `${rawDescription
    .slice(0, 2)
    .toUpperCase()}${rawDescription.slice(2)}`;

  const match = capitalizedDescription.match(taskRegex);

  if (match) {
    const [, prefix, taskNumber, customDescription] = match;

    if (prefix && taskNumber) {
      return {
        variant: "with-task",
        prefix,
        taskNumber: parseInt(taskNumber, 10),
        description: customDescription ? customDescription.trim() : null,
      };
    }
  }

  return {
    variant: "no-task",
    description: rawDescription,
  };
};
