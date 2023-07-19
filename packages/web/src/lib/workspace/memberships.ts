import { z } from 'zod';

export const membershipRoleSchema = z.enum(['owner', 'member']);

export type MembershipRole = z.infer<typeof membershipRoleSchema>;
