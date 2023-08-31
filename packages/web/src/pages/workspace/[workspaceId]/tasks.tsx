import { createServerSideHelpers } from '@trpc/react-query/server';
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import superjson from 'superjson';
import { WorkspaceLayout } from '@timesheeter/web/components/workspace/WorkspaceLayout';
import { appRouter } from '@timesheeter/web/server/api/root';
import { createTRPCContext } from '@timesheeter/web/server/api/trpc';
import { type RouterOutputs, api } from '@timesheeter/web/utils/api';
import { type WorkspaceInfo, getWorkspaceInfoDiscrete } from '@timesheeter/web/server/lib/workspace-info';
import { useEffect, useMemo, useState } from 'react';
import { EditTaskSideOver } from '@timesheeter/web/components/workspace/tasks/EditTaskSideOver';
import { TaskPanel } from '@timesheeter/web/components/workspace/tasks/TaskPanel';
import { TASKS_HELP_TEXT } from '@timesheeter/web/lib/workspace/tasks';
import { ProjectIcon, TaskIcon } from '@timesheeter/web/lib';
import { SimpleEmptyState } from '@timesheeter/web/components/ui/SimpleEmptyState';
import { SelectableList } from '@timesheeter/web/components/ui/SelectableList';
import { useRouter } from 'next/router';
import { ListFilter } from '@timesheeter/web/components/ui/ListFilter';

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

// Disables pagination for now due to issues
const fetchAllToPage = true;

const Tasks = ({ workspaceInfo }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [pageCount, setPageCount] = useState(1);

  const { refetch: refetchTasks, data: taskData } = api.workspace.tasks.list.useQuery(
    {
      workspaceId: workspaceInfo.workspace.id,
      page: pageCount,
      fetchAllToPage,
    },
    {
      onSuccess: ({ data: newTasks }) => {
        setTasks((oldTasks) => {
          if (fetchAllToPage) {
            return newTasks;
          }

          const oldTasksNotInNewTasks = oldTasks.filter((oldTask) => !newTasks.find((task) => task.id === oldTask.id));

          return [...oldTasksNotInNewTasks, ...newTasks];
        });
      },
    }
  );

  const [tasks, setTasks] = useState<RouterOutputs['workspace']['tasks']['list']['data']>(taskData?.data ?? []);

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
      tasks.map((task) => {
        const taskNumber = task.ticketForTask
          ? `${task.ticketForTask.taskPrefix.prefix}-${task.ticketForTask.number}`
          : undefined;

        return {
          id: task.id,
          label: task.name ?? undefined,
          subLabel: task.project.name,
          thirdLabel: taskNumber,
          icon: TaskIcon,
          onClick: () =>
            setSelectedTask({
              id: task.id,
              index: tasks.findIndex((i) => i.id === task.id),
            }),
          selected: selectedTask?.id === task.id,
        };
      }),
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

    if (selectedTask !== null && !tasks?.find((i) => i.id === selectedTask.id)) {
      setSelectedTask(null);
    }
  }, [tasks, selectedTask]);

  const { push } = useRouter();

  const taskFilters = useTaskFilters({ projects: projects ?? [] });

  if (!projects?.[0]) {
    return (
      <WorkspaceLayout workspaceInfo={workspaceInfo}>
        <SimpleEmptyState
          title="Projects are required for tasks"
          icon={ProjectIcon}
          helpText="Create a project first then come back here"
          button={{
            label: 'Create project',
            onClick: () => push(`/workspace/${workspaceInfo.workspace.id}/projects?create=true`),
          }}
        />
      </WorkspaceLayout>
    );
  }

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
              label: 'New task',
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
          <div className="flex h-full flex-col">
            <ListFilter filters={taskFilters} />
            <nav className="h-full overflow-y-auto">
              <SelectableList items={taskItems} loadMore={taskData?.next ? fetchNextPage : undefined} />
            </nav>
          </div>
        }
      >
        {tasks.map((task) => (
          <div key={task.id} className={task.id === selectedTask?.id ? '' : 'hidden'}>
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

const useTaskFilters = ({ projects }: { projects: RouterOutputs['workspace']['projects']['listMinimal'] }) => {
  const filters: ListFilter[] = [];

  if (projects) {
    filters.push({
      variant: 'select-group-filter',
      label: 'Projects',
      groups: [
        {
          items: projects.map((project) => ({
            label: project.name,
            onClick: () => {
              console.log('click');
            },
            icon: ProjectIcon,
            active: true,
          })),
        },
      ],
    });
  }

  return filters;
};
