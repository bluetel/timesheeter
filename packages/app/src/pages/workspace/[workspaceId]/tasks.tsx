import { createServerSideHelpers } from "@trpc/react-query/server";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import superjson from "superjson";
import { WorkspaceLayout } from "@timesheeter/app/components/workspace/WorkspaceLayout";
import { appRouter } from "@timesheeter/app/server/api/root";
import { createTRPCContext } from "@timesheeter/app/server/api/trpc";
import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { getWorkspaceInfoDiscrete } from "@timesheeter/app/server/lib/workspace-info";
import { useEffect, useMemo, useState } from "react";
import { EditTaskSideOver } from "@timesheeter/app/components/workspace/tasks/EditTaskSideOver";
import { TaskPanel } from "@timesheeter/app/components/workspace/tasks/TaskPanel";
import { TASKS_HELP_TEXT } from "@timesheeter/app/lib/workspace/tasks";
import { TaskIcon } from "@timesheeter/app/lib";
import { SimpleEmptyState } from "@timesheeter/app/components/ui/SimpleEmptyState";
import { SelectableList } from "@timesheeter/app/components/ui/SelectableList";
import { useRouter } from "next/router";

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
    helpers.workspace.tasks.list.prefetch({
      workspaceId: workspaceInfo.workspace.id,
      page: 1,
    }),
    helpers.workspace.projects.listMinimal.prefetch({
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

const Tasks = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [pageCount, setPageCount] = useState(1);

  const [tasks, setTasks] = useState<
    RouterOutputs["workspace"]["tasks"]["list"]["data"]
  >([]);

  const { refetch: refetchTasks, data: taskData } =
    api.workspace.tasks.list.useQuery(
      {
        workspaceId: workspaceInfo.workspace.id,
        page: pageCount,
      },
      {
        onSuccess: ({ data: tasks }) => {
          setTasks((oldTasks) =>
            // Insert new entries to the beginning of the list so new entries are
            // kept
            [...tasks, ...oldTasks].filter(
              (task, index, self) =>
                index === self.findIndex((t) => t.id === task.id)
            )
          );
        },
      }
    );

  const fetchNextPage = async () => {
    setPageCount((oldPageCount) => oldPageCount + 1);
    await refetchTasks();
  };

  const { data: projects } = api.workspace.projects.listMinimal.useQuery({
    workspaceId: workspaceInfo.workspace.id,
  });

  const [showNewTaskSideOver, setShowNewTaskSideOver] = useState(false);

  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const taskItems = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        label: task.name ?? "Unnamed task",
        subLabel:
          task.project?.taskPrefix && task.taskNumber
            ? `${task.project.taskPrefix}-${task.taskNumber}`
            : undefined,
        icon: TaskIcon,
        onClick: () =>
          setSelectedTask({
            id: task.id,
            index: tasks.findIndex((i) => i.id === task.id),
          }),
        selected: selectedTask?.id === task.id,
      })),
    [tasks, selectedTask]
  );

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewTaskSideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    if (tasks && tasks[0] && !selectedTask) {
      setSelectedTask({
        id: tasks[0].id,
        index: 0,
      });
    } else if (tasks?.length === 0) {
      setSelectedTask(null);
    }

    if (
      selectedTask !== null &&
      !tasks?.find((i) => i.id === selectedTask.id)
    ) {
      setSelectedTask(null);
    }
  }, [tasks, selectedTask]);

  if (!tasks || taskItems.length === 0) {
    return (
      <>
        <EditTaskSideOver
          show={showNewTaskSideOver}
          onClose={() => setShowNewTaskSideOver(false)}
          refetchTasks={refetchTasks}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
          projects={projects ?? []}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Tasks"
            helpText={TASKS_HELP_TEXT}
            button={{
              label: "New task",
              onClick: () => setShowNewTaskSideOver(true),
            }}
            icon={TaskIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditTaskSideOver
        show={showNewTaskSideOver}
        onClose={() => setShowNewTaskSideOver(false)}
        refetchTasks={refetchTasks}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
        projects={projects ?? []}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList
              items={taskItems}
              loadMore={taskData?.next ? fetchNextPage : undefined}
            />
          </nav>
        }
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            className={task.id === selectedTask?.id ? "" : "hidden"}
          >
            <TaskPanel
              task={task}
              refetchTasks={refetchTasks}
              onNewTaskClick={() => setShowNewTaskSideOver(true)}
              projects={projects ?? []}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default Tasks;
