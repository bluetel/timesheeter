import { createServerSideHelpers } from "@trpc/react-query/server";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import superjson from "superjson";
import { WorkspaceLayout } from "@timesheeter/app/components/workspace/WorkspaceLayout";
import { appRouter } from "@timesheeter/app/server/api/root";
import { createTRPCContext } from "@timesheeter/app/server/api/trpc";
import { api } from "@timesheeter/app/utils/api";
import { getWorkspaceInfoDiscrete } from "@timesheeter/app/server/lib/workspace-info";
import { useEffect, useMemo, useState } from "react";
import { TIMESHEET_ENTRIES_HELP_TEXT } from "@timesheeter/app/lib/workspace/timesheet-entries";
import { TaskIcon } from "@timesheeter/app/lib";
import { SimpleEmptyState } from "@timesheeter/app/components/ui/SimpleEmptyState";
import { SelectableList } from "@timesheeter/app/components/ui/SelectableList";
import { useRouter } from "next/router";
import { TimesheetEntryPanel } from "@timesheeter/app/components/workspace/timesheet-entries/TimesheetEntryPanel";
import { EditTimesheetEntrySideOver } from "@timesheeter/app/components/workspace/timesheet-entries/EditTimesheetEntrySideOver";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { redirect, props: workspaceInfo } = await getWorkspaceInfoDiscrete(
    context
  );

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

const TimesheetEntries = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: timesheetEntries, refetch: refetchTimesheetEntries } =
    api.workspace.timesheetEntries.list.useQuery({
      workspaceId: workspaceInfo.workspace.id,
    });

  const { data: tasks } = api.workspace.tasks.listMinimal.useQuery({
    workspaceId: workspaceInfo.workspace.id,
  });

  const [showNewtimesheetEntriesideOver, setShowNewTimesheetEntriesSideOver] =
    useState(false);

  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    index: number;
  } | null>(null);

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

    if (
      selectedTask !== null &&
      !timesheetEntries?.find((i) => i.id === selectedTask.id)
    ) {
      setSelectedTask(null);
    }
  }, [timesheetEntries, selectedTask]);

  const taskItems = useMemo(
    () =>
      timesheetEntries?.map((timesheetEntry) => ({
        label: timesheetEntry.description ?? ``,
        subLabel:
          timesheetEntry.task.taskNumber &&
          timesheetEntry.task.project?.taskPrefix
            ? `${timesheetEntry.task.project.taskPrefix}-${timesheetEntry.task.taskNumber}`
            : undefined,
        icon: TaskIcon,
        onClick: () =>
          setSelectedTask({
            id: timesheetEntry.id,
            index: timesheetEntries.findIndex(
              (i) => i.id === timesheetEntry.id
            ),
          }),
        selected: selectedTask?.id === timesheetEntry.id,
      })) ?? [],
    [timesheetEntries, selectedTask]
  );

  if (!timesheetEntries || taskItems.length === 0) {
    return (
      <>
        <EditTimesheetEntrySideOver
          show={showNewtimesheetEntriesideOver}
          onClose={() => setShowNewTimesheetEntriesSideOver(false)}
          refetchTimesheetEntries={refetchTimesheetEntries}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
          tasks={tasks ?? []}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No timesheetEntries"
            helpText={TIMESHEET_ENTRIES_HELP_TEXT}
            button={{
              label: "New timesheetEntry",
              onClick: () => setShowNewTimesheetEntriesSideOver(true),
            }}
            icon={TaskIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditTimesheetEntrySideOver
        show={showNewtimesheetEntriesideOver}
        onClose={() => setShowNewTimesheetEntriesSideOver(false)}
        refetchTimesheetEntries={refetchTimesheetEntries}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
        tasks={tasks ?? []}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList items={taskItems} />
          </nav>
        }
      >
        {timesheetEntries.map((timesheetEntry) => (
          <div
            key={timesheetEntry.id}
            className={timesheetEntry.id === selectedTask?.id ? "" : "hidden"}
          >
            <TimesheetEntryPanel
              timesheetEntry={timesheetEntry}
              refetchTimesheetEntries={refetchTimesheetEntries}
              onNewTimesheetEntryClick={() =>
                setShowNewTimesheetEntriesSideOver(true)
              }
              tasks={tasks ?? []}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default TimesheetEntries;
