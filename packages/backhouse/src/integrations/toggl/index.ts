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
import { getAxiosClient, getReportDataWorkspace, getWorkspaces, toggl } from './api';
import { matchTaskRegex } from '@timesheeter/web';
import { getAllTogglData, getAndVerifyTogglWorkspaceId } from './toggl-data';

type TogglIntegration = ParsedIntegration & {
  config: {
    type: 'TogglIntegration';
  };
};

export const handleTogglIntegration = async ({
  integration: {
    config: { apiKey, togglWorkspaceId: unverifiedWorkspaceId, scanPeriod },
  },
}: {
  integration: TogglIntegration;
}) => {
  const prisma = await getPrismaClient();
  const axiosClient = getAxiosClient({ apiKey });

  const endDate = new Date();

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - scanPeriod);

  const togglWorkspaceId = await getAndVerifyTogglWorkspaceId({ axiosClient, togglWorkspaceId: unverifiedWorkspaceId });

  const allTogglData = await getAllTogglData({
    axiosClient,
    workspaceId: togglWorkspaceId,
    startDate,
    endDate,
  });
};
