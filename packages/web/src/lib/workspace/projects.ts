import { z } from 'zod';
import { taskPrefixRegex } from '../regex';
import { type IconType } from 'react-icons';
import { FolderIcon } from '@heroicons/react/24/outline';

export const PROJECTS_HELP_TEXT =
  'Projects group related tasks together, the are auto created when you create a task with a prefix' as const;

export const ProjectIcon = FolderIcon as IconType;

export const autoAssignTasksHelpText =
  `Entries that start with these names will automatically be assigned to this project (e.g. Standup in "Standup - New feature discussion"), even if they don't have a task prefix` as const;

export const autoAssignTaskSchema = z.string().min(1);

export const PROJECT_DEFINITIONS = {
  DefaultProject: {
    name: 'Project',
    fields: [
      {
        accessor: 'autoAssignTasks',
        name: 'Auto-assign tasks',
        type: 'string_list',
        required: false,
        protectCount: 0,
        description: autoAssignTasksHelpText,
      },
    ],
    configSchema: z.object({
      type: z.literal('DefaultProject'),
      autoAssignTasks: z.array(autoAssignTaskSchema).default([]),
    }),
    updateProjectSchema: z.object({
      type: z.literal('DefaultProject'),
      autoAssignTasks: z.array(autoAssignTaskSchema).default([]).optional(),
    }),
    defaultConfig: {
      type: 'DefaultProject',
      autoAssignTasks: [] as string[],
    },
  },
} as const;

export type ProjectType = keyof typeof PROJECT_DEFINITIONS;

export type ProjectDetail = (typeof PROJECT_DEFINITIONS)[ProjectType];

export const projectConfigSchema = PROJECT_DEFINITIONS.DefaultProject.configSchema;

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export const updateProjectConfigSchema = PROJECT_DEFINITIONS.DefaultProject.updateProjectSchema;

export type UpdateProjectConfig = z.infer<typeof updateProjectConfigSchema>;

export const getDefaultProjectConfig = (type: ProjectType = 'DefaultProject') =>
  PROJECT_DEFINITIONS[type].defaultConfig;

export const createProjectSchema = z.object({
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100),
  taskPrefix: z.string().regex(taskPrefixRegex).nullable(),
  config: projectConfigSchema,
});

export const updateProjectSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100).optional(),
  taskPrefix: z.string().regex(taskPrefixRegex).nullable().optional(),
  config: updateProjectConfigSchema,
});
