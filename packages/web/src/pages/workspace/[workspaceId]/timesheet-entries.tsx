import { createServerSideHelpers } from '@trpc/react-query/server';
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import superjson from 'superjson';
import { WorkspaceLayout } from '@timesheeter/web/components/workspace/WorkspaceLayout';
import { appRouter } from '@timesheeter/web/server/api/root';
import { createTRPCContext } from '@timesheeter/web/server/api/trpc';
import { type RouterOutputs, api } from '@timesheeter/web/utils/api';
import { type WorkspaceInfo, getWorkspaceInfoDiscrete } from '@timesheeter/web/server/lib/workspace-info';
import { useEffect, useMemo, useState } from 'react';
import { TIMESHEET_ENTRIES_HELP_TEXT, TimesheetEntryIcon } from '@timesheeter/web/lib/workspace/timesheet-entries';
import { SimpleEmptyState } from '@timesheeter/web/components/ui/SimpleEmptyState';
import { SelectableList } from '@timesheeter/web/components/ui/SelectableList';
import { useRouter } from 'next/router';
import { TimesheetEntryPanel } from '@timesheeter/web/components/workspace/timesheet-entries/TimesheetEntryPanel';
import { EditTimesheetEntrySideOver } from '@timesheeter/web/components/workspace/timesheet-entries/EditTimesheetEntrySideOver';
import { TaskIcon } from '@timesheeter/web/lib';

type GetServerSidePropsResult =
  | {
      redirect: {
        destination: string;
        permanent: boolean;
      };
    }
  | {
      props: {
        workspaceInfo: WorkspaceInfo;
        trpcState: unknown;
      };
    }
  | {
      notFound: true;
    };

export const getServerSideProps = async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult> => {
  const { redirect, props: workspaceInfo } = await getWorkspaceInfoDiscrete(context);

  if (redirect) {
    return { redirect };
  }

  if (!workspaceInfo) {
    return {
      notFound: true,
    };
  }

  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext({
      req: context.req,
      res: context.res,
    }),
    transformer: superjson,
  });

  await Promise.all([
    helpers.workspace.timesheetEntries.list.prefetch({
      workspaceId: workspaceInfo.workspace.id,
      page: 1,
    }),
    helpers.workspace.tasks.listMinimal.prefetch({
      workspaceId: workspaceInfo.workspace.id,
    }),
  ]);

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };
};

// Disables pagination for now due to issues
const fetchAllToPage = true;

const TimesheetEntries = ({ workspaceInfo }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [pageCount, setPageCount] = useState(1);

  const { data: timesheetEntryData, refetch: refetchTimesheetEntries } = api.workspace.timesheetEntries.list.useQuery(
    {
      workspaceId: workspaceInfo.workspace.id,
      page: pageCount,
      fetchAllToPage,
    },
    {
      onSuccess: ({ data: newTimesheetEntries }) => {
        setTimesheetEntries((oldEntries) => {
          if (fetchAllToPage) {
            return newTimesheetEntries;
          }

          const oldTimesheetEntriesNotInNew = oldEntries.filter(
            (oldEntry) => !newTimesheetEntries.find((newEntry) => newEntry.id === oldEntry.id)
          );

          return [...oldTimesheetEntriesNotInNew, ...newTimesheetEntries];
        });
      },
    }
  );

  const [timesheetEntries, setTimesheetEntries] = useState<
    RouterOutputs['workspace']['timesheetEntries']['list']['data']
  >(timesheetEntryData?.data ?? []);

  const fetchNextPage = async () => {
    setPageCount((oldPageCount) => oldPageCount + 1);
    await refetchTimesheetEntries();
  };

  const { data: tasks } = api.workspace.tasks.listMinimal.useQuery({
    workspaceId: workspaceInfo.workspace.id,
  });

  const [showNewTimesheetEntriesSideOver, setShowNewTimesheetEntriesSideOver] = useState(false);

  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const timesheetEntryItems = useMemo(
    () =>
      timesheetEntries.map((timesheetEntry) => {
        const getSubDescription = () => {
          if (timesheetEntry.task.ticketForTask) {
            return `${timesheetEntry.task.ticketForTask.taskPrefix.prefix}-${timesheetEntry.task.ticketForTask.number}`;
          }

          return timesheetEntry.task.name;
        };

        const subDescription = getSubDescription();

        return {
          label: timesheetEntry.description ?? subDescription ?? 'Unnamed entry',
          subLabel: timesheetEntry.description ? subDescription : undefined,
          icon: TimesheetEntryIcon,
          onClick: () =>
            setSelectedTask({
              id: timesheetEntry.id,
              index: timesheetEntries.findIndex((i) => i.id === timesheetEntry.id),
            }),
          selected: selectedTask?.id === timesheetEntry.id,
        };
      }),
    [timesheetEntries, selectedTask]
  );

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewTimesheetEntriesSideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    if (timesheetEntries && timesheetEntries[0] && !selectedTask) {
      setSelectedTask({
        id: timesheetEntries[0].id,
        index: 0,
      });
    } else if (timesheetEntries?.length === 0) {
      setSelectedTask(null);
    }

    if (selectedTask !== null && !timesheetEntries?.find((i) => i.id === selectedTask.id)) {
      setSelectedTask(null);
    }
  }, [timesheetEntries, selectedTask]);

  const { push } = useRouter();

  if (!tasks?.[0]) {
    return (
      <WorkspaceLayout workspaceInfo={workspaceInfo}>
        <SimpleEmptyState
          title="Tasks are required for timesheet entries"
          icon={TaskIcon}
          helpText="Create a task first then come back here"
          button={{
            label: 'Create task',
            onClick: () => push(`/workspace/${workspaceInfo.workspace.id}/tasks?create=true`),
          }}
        />
      </WorkspaceLayout>
    );
  }

  if (timesheetEntryItems.length === 0) {
    return (
      <>
        <EditTimesheetEntrySideOver
          show={showNewTimesheetEntriesSideOver}
          onClose={() => setShowNewTimesheetEntriesSideOver(false)}
          refetchTimesheetEntries={refetchTimesheetEntries}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
          tasks={tasks ?? []}
          defaultTaskId={tasks?.[0].id}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Timesheet Entries"
            helpText={TIMESHEET_ENTRIES_HELP_TEXT}
            button={{
              label: 'New timesheet entry',
              onClick: () => setShowNewTimesheetEntriesSideOver(true),
            }}
            icon={TimesheetEntryIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      {tasks?.[0] && (
        <EditTimesheetEntrySideOver
          show={showNewTimesheetEntriesSideOver}
          onClose={() => setShowNewTimesheetEntriesSideOver(false)}
          refetchTimesheetEntries={refetchTimesheetEntries}
          data={{ new: true }}
          workspaceId={workspaceInfo.workspace.id}
          tasks={tasks ?? []}
          defaultTaskId={tasks?.[0].id}
        />
      )}
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList
              items={timesheetEntryItems}
              loadMore={timesheetEntryData?.next ? fetchNextPage : undefined}
            />
          </nav>
        }
      >
        {(timesheetEntries ?? []).map((timesheetEntry) => (
          <div key={timesheetEntry.id} className={timesheetEntry.id === selectedTask?.id ? '' : 'hidden'}>
            <TimesheetEntryPanel
              timesheetEntry={timesheetEntry}
              refetchTimesheetEntries={refetchTimesheetEntries}
              onNewTimesheetEntryClick={() => setShowNewTimesheetEntriesSideOver(true)}
              tasks={tasks ?? []}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default TimesheetEntries;
