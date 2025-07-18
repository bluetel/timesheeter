import {
  type InferGetServerSidePropsType,
  type GetServerSidePropsContext,
} from "next";
import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import { WorkspaceLayout } from "@timesheeter/web/components/workspace/WorkspaceLayout";
import { appRouter } from "@timesheeter/web/server/api/root";
import { createTRPCContext } from "@timesheeter/web/server/api/trpc";
import { getWorkspaceInfo } from "@timesheeter/web/server/lib/workspace-info";
import { api } from "@timesheeter/web/utils/api";
import { useState } from "react";
import {
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { DetailPanel } from "@timesheeter/web/components/ui/DetailPanel/DetailPanel";
import { type IconType } from "react-icons";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const workspaceInfo = await getWorkspaceInfo(context);

  if ("redirect" in workspaceInfo) {
    return { redirect: workspaceInfo.redirect };
  }

  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext({
      req: context.req,
      res: context.res,
    }),
    transformer: superjson,
  });

  const currentDate = new Date();

  await helpers.workspace.monthlyTime.getMonthlyStats.prefetch({
    workspaceId: workspaceInfo.props.workspace.id,
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  });

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };
};

const MonthlyTime = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1
  );

  const { data: monthlyStats, isLoading } =
    api.workspace.monthlyTime.getMonthlyStats.useQuery({
      workspaceId: workspaceInfo.props.workspace.id,
      year: selectedYear,
      month: selectedMonth,
    });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)}h`;
  };

  const betaWarning = (
    <div className="my-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="flex">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-yellow-800">Beta Feature</p>
          <p className="text-sm text-yellow-700">
            This monthly time tracking feature is in beta. Calculations may be
            inaccurate and should be verified independently.
          </p>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <WorkspaceLayout workspaceInfo={workspaceInfo.props}>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  const summaryStats = [
    {
      label: {
        title: "Total Hours",
        description: "All timesheet entries for the month",
      },
      field: {
        variant: "text" as const,
        value: formatHours(monthlyStats?.summary.totalHours || 0),
      },
    },
    {
      label: {
        title: "Working Hours",
        description: "Hours logged on work tasks",
      },
      field: {
        variant: "text" as const,
        value: formatHours(monthlyStats?.summary.workingHours || 0),
      },
    },
    {
      label: {
        title: "Non-Working Hours",
        description: "Hours logged on non-work activities",
      },
      field: {
        variant: "text" as const,
        value: formatHours(monthlyStats?.summary.nonWorkingHours || 0),
      },
    },
    {
      label: {
        title: "TOIL Hours",
        description: "Time off in lieu hours taken",
      },
      field: {
        variant: "text" as const,
        value: formatHours(monthlyStats?.summary.toilHours || 0),
      },
    },
    {
      label: {
        title: "Net Working Hours",
        description: "Working + Non-working - TOIL hours",
      },
      field: {
        variant: "text" as const,
        value: formatHours(monthlyStats?.summary.netWorkingHours || 0),
      },
    },
    {
      label: {
        title: "Target Hours",
        description: "Expected working hours for the month",
      },
      field: {
        variant: "text" as const,
        value: formatHours(monthlyStats?.summary.targetHours || 0),
      },
    },
    {
      label: {
        title: "Over/Under Hours",
        description: "Difference from target hours",
      },
      field: {
        variant: "text" as const,
        value: formatHours(monthlyStats?.summary.hoursOverUnder || 0),
      },
    },
  ];

  const dailyBreakdownContent = (
    <div className="space-y-4">
      {betaWarning}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Working Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TOIL Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Non-Working Hours
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {monthlyStats?.dailyBreakdown.map((day) => (
              <tr key={day.date} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatDate(day.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatHours(day.totalHours)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatHours(day.netHours)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatHours(day.workingHours)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatHours(day.toilHours)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatHours(day.nonWorkingHours)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(!monthlyStats?.dailyBreakdown ||
        monthlyStats.dailyBreakdown.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          No timesheet entries found for this month.
        </div>
      )}
    </div>
  );

  return (
    <WorkspaceLayout workspaceInfo={workspaceInfo.props}>
      <div className="p-8">
        <DetailPanel
          header={{
            title: "Monthly Time Summary",
            description: "Overview of your time allocation for the month",
          }}
          content={{
            name: `${monthNames[selectedMonth - 1]} ${selectedYear} Summary`,
            description: `Monthly time tracking summary for ${
              monthNames[selectedMonth - 1]
            } ${selectedYear}`,
            icon: ClockIcon as IconType,
            endButtons: {
              custom: (
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {monthNames.map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => currentDate.getFullYear() - 4 + i
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              ),
            },
          }}
          tabs={{
            multiple: true,
            bodies: [
              {
                label: "Summary",
                icon: ClockIcon as IconType,
                body: (
                  <div className="space-y-6">
                    {betaWarning}
                    {summaryStats.map((stat, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-3 border-b border-gray-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {stat.label.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {stat.label.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {stat.field.value}
                          </p>
                        </div>
                      </div>
                    ))}
                    {monthlyStats?.summary.hoursOverUnder !== undefined && (
                      <div
                        className={`p-4 rounded-md ${
                          monthlyStats.summary.hoursOverUnder >= 0
                            ? "bg-green-50 border border-green-200"
                            : "bg-red-50 border border-red-200"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            monthlyStats.summary.hoursOverUnder >= 0
                              ? "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          {monthlyStats.summary.hoursOverUnder >= 0
                            ? `You've worked ${formatHours(
                                monthlyStats.summary.hoursOverUnder
                              )} over target this month.`
                            : `You're ${formatHours(
                                Math.abs(monthlyStats.summary.hoursOverUnder)
                              )} under target this month.`}
                        </p>
                      </div>
                    )}
                  </div>
                ),
                subDescription:
                  "Summary statistics for your monthly time tracking",
              },
              {
                label: "Daily Breakdown",
                icon: ClockIcon as IconType,
                body: dailyBreakdownContent,
                subDescription: "Day-by-day breakdown of your time entries",
              },
            ],
          }}
        />
      </div>
    </WorkspaceLayout>
  );
};

export default MonthlyTime;
