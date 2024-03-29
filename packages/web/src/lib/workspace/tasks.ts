import { RectangleStackIcon } from '@heroicons/react/24/outline';
import { type IconType } from 'react-icons/lib';
import { z } from 'zod';
import { taskRegex } from '../regex';

export const UNCATEGORIZED_TASKS_TASK_NAME = 'Uncategorized tasks';

export const TASKS_HELP_TEXT = 'Tasks group timesheet entries together, they can have assigned numbers e.g. from Jira';

export const TaskIcon = RectangleStackIcon as IconType;

export const TASK_DEFINITIONS = {
  DefaultTask: {
    name: 'Task',
    fields: [],
    configSchema: z.object({
      type: z.literal('DefaultTask'),
    }),
    updateTaskSchema: z.object({
      type: z.literal('DefaultTask'),
    }),
    defaultConfig: {
      type: 'DefaultTask',
    },
  },
} as const;

export type TaskType = keyof typeof TASK_DEFINITIONS;

export type TaskDetail = (typeof TASK_DEFINITIONS)[TaskType];

export const taskConfigSchema = TASK_DEFINITIONS.DefaultTask.configSchema;

export type TaskConfig = z.infer<typeof taskConfigSchema>;

export const updateTaskConfigSchema = TASK_DEFINITIONS.DefaultTask.updateTaskSchema;

export type UpdateTaskConfig = z.infer<typeof updateTaskConfigSchema>;

export const getDefaultTaskConfig = (type: TaskType = 'DefaultTask') => TASK_DEFINITIONS[type].defaultConfig;

export const createTaskSchema = z.object({
  workspaceId: z.string().cuid2(),
  name: z.string().min(0).max(100),
  projectId: z.string().cuid2(),
  taskNumber: z
    .any()
    .transform((value) => (value === undefined ? undefined : value ? parseInt(String(value), 10) : null))
    .pipe(z.number().int().positive().nullable()),
  taskPrefixId: z.string().cuid2().nullable(),
  scoped: z.boolean().default(false),
  config: taskConfigSchema,
});

export const updateTaskSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  name: z.string().min(0).max(100).optional(),
  projectId: z.string().cuid2().optional(),
  taskNumber: z
    .any()
    .transform((value) => (value === undefined ? undefined : value ? parseInt(String(value), 10) : null))
    .pipe(z.number().int().positive().nullable().optional()),
  taskPrefixId: z.string().cuid2().nullable().optional(),
  scoped: z.boolean().default(false).optional(),
  config: updateTaskConfigSchema,
});

export type MatchedTaskResult =
  | {
      variant: 'jira-based';
      prefix: string;
      taskNumber: number;
      description: string | null;
    }
  | {
      variant: 'description-based';
      taskName: string;
      description: string | null;
    };

// 2 captial letters, followed by a dash, followed by 1 or more numbers, it can have additional text after the numbers if there is a hypen surrounded by spaces

// eg AC-1234 - Test description

// Prefix 1-8 letters (eg AC) or null if there is no prefix
// Task number (eg 1234) or null if there is no task number

// description (eg Test description) or null if there is no description

export const matchTaskRegex = (rawDescription: string): MatchedTaskResult => {
  const match = rawDescription.match(taskRegex);

  if (match) {
    const [, prefix, taskNumber, customDescription] = match;

    if (prefix && taskNumber) {
      return {
        variant: 'jira-based',
        prefix: prefix.toUpperCase(),
        taskNumber: parseInt(taskNumber, 10),
        description: customDescription ? customDescription.trim() : null,
      };
    }
  }

  // See if there is a colon in the description, if there is then we have a task name
  // and a description

  const colonIndex = rawDescription.indexOf(':');

  if (colonIndex > 0) {
    const taskName = rawDescription.slice(0, colonIndex).trim();
    const description = rawDescription.slice(colonIndex + 1).trim();

    return {
      variant: 'description-based',
      taskName,
      description: description ? description : null,
    };
  }

  return {
    variant: 'description-based',
    taskName: rawDescription,
    description: null,
  };
};

export const TOIL_TASK_NAME = 'TOIL';
