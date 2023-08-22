import { z } from 'zod';
import { UserGroupIcon } from '@heroicons/react/20/solid';
import { type IconType } from 'react-icons';

export const membershipRoleSchema = z.enum(['owner', 'member']);

export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const WORKSPACES_HELP_TEXT = 'Group related projects and team members together into workspaces';

export const MEMBERSHIPS_HELP_TEXT =
  'Team members can be added to a workspace and share projects, tasks and integrations';

export const INVITATIONS_HELP_TEXT =
  'Invite team members to a workspace, they will receive an email with a link to join';

export const WorkspaceIcon = UserGroupIcon as IconType;

export const membershipSchema = z.object({
  userId: z.string().cuid2(),
  role: membershipRoleSchema,
});

export const invitationSchema = z.string().email();

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(30),
  memberships: z.array(membershipSchema).default([]),
  invitations: z.array(invitationSchema).default([]),
});

export const updateWorkspaceSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().min(1).max(30).optional(),
  memberships: z.array(membershipSchema).default([]).optional(),
  invitations: z.array(invitationSchema).optional(),
});
