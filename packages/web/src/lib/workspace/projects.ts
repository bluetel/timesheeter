import { z } from 'zod';
import { taskPrefixRegex } from '../regex';
import { type IconType } from 'react-icons';
import { FolderIcon } from '@heroicons/react/24/outline';

export const PROJECTS_HELP_TEXT =
  'Projects group related tasks together, projects are auto created when you create a task with a prefix';

export const ProjectIcon = FolderIcon as IconType;

export const taskPrefixesHelpText = `Jira prefixes that will be auto-assigned to this project and contain tracked task numbers (e.g. "AC" in "AC-1234")`;

export const PROJECT_DEFINITIONS = {
  DefaultProject: {
    name: 'Project',
    fields: [
      {
        accessor: 'taskPrefixes',
        name: 'Task prefixes',
        type: 'string_list',
        required: false,
        protectCount: 0,
        description: taskPrefixesHelpText,
      },
    ],
    configSchema: z.object({
      type: z.literal('DefaultProject'),
      taskPrefixes: z.array(z.string().regex(taskPrefixRegex)).default([]),
    }),
    updateProjectSchema: z.object({
      type: z.literal('DefaultProject'),
      taskPrefixes: z.array(z.string().regex(taskPrefixRegex)).default([]).optional(),
    }),
    defaultConfig: {
      type: 'DefaultProject',
      taskPrefixes: [] as string[],
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
  config: projectConfigSchema,
});

export const updateProjectSchema = z.object({
  id: z.string().cuid2(),
  workspaceId: z.string().cuid2(),
  name: z.string().min(1).max(100).optional(),
  config: updateProjectConfigSchema,
});

/** A special project name that does represent non-billable activities */
export const NON_WORKING_PROJECT_NAME = 'Non Working';
