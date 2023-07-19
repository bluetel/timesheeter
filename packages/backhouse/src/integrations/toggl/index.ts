import {
  getPrismaClient,
  ParsedIntegration,
  encrypt,
  getDefaultTimesheetEntryConfig,
  getDefaultTaskConfig,
  ParsedProject,
  parseProject,
  getDefaultProjectConfig,
} from '@timesheeter/web';
import { getAxiosClient, getReportDataWorkspace, getWorkspaces } from './api';
import { matchTaskRegex } from '@timesheeter/web';

type TogglIntegration = ParsedIntegration & {
  config: {
    type: 'TogglIntegration';
  };
};

export const handleTogglIntegration = async ({ integration }: { integration: TogglIntegration }) => {
  const prisma = await getPrismaClient();

  const reportData = await getReportData({ integration });


