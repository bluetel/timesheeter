import { TaskIcon } from '@timesheeter/web/lib/workspace/tasks';
import { EditTaskSideOver } from './EditTaskSideOver';
import { useState } from 'react';
import { DetailPanel } from '@timesheeter/web/components/ui/DetailPanel/DetailPanel';
import { DeleteTaskModal } from './DeleteTaskModal';
import { TASKS_HELP_TEXT } from '@timesheeter/web/lib/workspace/tasks';
import { type RouterOutputs } from '@timesheeter/web/utils/api';
import { BasicDetailList, type BasicDetailListItem } from '@timesheeter/web/components/ui/DetailPanel/BasicDetailList';

type TaskPanelProps = {
  task: RouterOutputs['workspace']['tasks']['list']['data'][number];
  refetchTasks: () => unknown;
  onNewTaskClick: () => void;
  projects: RouterOutputs['workspace']['projects']['listMinimal'];
};

export const TaskPanel = ({ task, refetchTasks, onNewTaskClick, projects }: TaskPanelProps) => {
  const [showEditTaskSideOver, setShowEditTaskSideOver] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);

  const basicDetails = useBasicDetails(task);

  const subLabel = task.ticketForTask
    ? `${task.ticketForTask.taskPrefix.prefix}-${task.ticketForTask.number}`
    : undefined;

  return (
    <>
      <DeleteTaskModal
        task={task}
        onClose={() => setShowDeleteTaskModal(false)}
        show={showDeleteTaskModal}
        refetchTasks={refetchTasks}
      />
      <EditTaskSideOver
        show={showEditTaskSideOver}
        onClose={() => setShowEditTaskSideOver(false)}
        refetchTasks={refetchTasks}
        data={{
          new: false,
          task,
        }}
        workspaceId={task.workspaceId}
        projects={projects}
      />
      <DetailPanel
        header={{
          title: 'Tasks',
          description: TASKS_HELP_TEXT,
          newButton: {
            label: 'New task',
            onClick: onNewTaskClick,
          },
        }}
        content={{
          name: task.name,
          description: subLabel,
          icon: TaskIcon,
          endButtons: {
            onEdit: () => setShowEditTaskSideOver(true),
            onDelete: () => setShowDeleteTaskModal(true),
          },
        }}
        tabs={{
          multiple: false,
          body: <BasicDetailList items={basicDetails} />,
        }}
      />
    </>
  );
};

const useBasicDetails = (task: RouterOutputs['workspace']['tasks']['list']['data'][number]) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: 'ID',
        description: 'The unique identifier for this task',
      },
      field: {
        variant: 'text',
        value: task.id,
      },
    },
    {
      label: {
        title: 'Project ID',
        description: 'The ID of the parent project',
      },
      field: {
        variant: 'text',
        value: task.project?.id ?? '',
      },
    },
    {
      label: {
        title: 'Project Name',
        description: 'The name of the parent project',
      },
      field: {
        variant: 'text',
        value: task.project?.name ?? '',
      },
    },
    {
      label: {
        title: 'Name',
        description: `Descriptive name for the task, e.g. "Fix paywall issues"`,
      },
      field: {
        variant: 'text',
        value: task.name,
      },
    },
    {
      label: {
        title: 'Task prefix',
        description: "The prefix for the task, e.g. 'AC'",
      },
      field: {
        variant: 'text',
        value: task.ticketForTask?.taskPrefix.prefix ?? '',
      },
    },
    {
      label: {
        title: 'Task number',
        description: 'The task number, excluding the workspace prefix',
      },
      field: {
        variant: 'text',
        value: task.ticketForTask?.number.toString() ?? '',
      },
    },
    // Hidden as unsure if this feature will be used
    // {
    //   label: {
    //     title: "Private Task",
    //     description: "Whether this task is private and scoped to the user who set it as private",
    //   },
    //   field: {
    //     variant: "text",
    //     value: task.scoped ? "Yes" : "No",
    //   },
    // }
  ];

  return details;
};
