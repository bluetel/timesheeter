import { TaskIcon } from "@timesheeter/app/lib/workspace/tasks";
import { EditTaskSideOver } from "./EditTaskSideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";
import { DeleteTaskModal } from "./DeleteTaskModal";
import { TASKS_HELP_TEXT } from "@timesheeter/app/lib/workspace/tasks";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";
import { AdjustmentsVerticalIcon } from "@heroicons/react/24/outline";
import { type IconType } from "react-icons";

type TaskDetailProps = {
  task: RouterOutputs["workspace"]["tasks"]["list"][number];
  refetchTasks: () => unknown;
  onNewTaskClick: () => void;
};

export const TaskPanel = ({
  task,
  refetchTasks,
  onNewTaskClick,
}: TaskDetailProps) => {
  const [showEditTasksideOver, setShowEditTasksideOver] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);

  const basicDetails = useBasicDetails(task);

  return (
    <>
      <DeleteTaskModal
        task={task}
        onClose={() => setShowDeleteTaskModal(false)}
        show={showDeleteTaskModal}
        refetchTasks={refetchTasks}
      />
      <EditTaskSideOver
        show={showEditTasksideOver}
        onClose={() => setShowEditTasksideOver(false)}
        refetchTasks={refetchTasks}
        data={{
          new: false,
          task,
        }}
        workspaceId={task.workspaceId}
      />
      <DetailPanel
        header={{
          title: "Tasks",
          description: TASKS_HELP_TEXT,
          newButton: {
            label: "New task",
            onClick: onNewTaskClick,
          },
        }}
        content={{
          name: task.name ?? "Unnamed task",
          icon: TaskIcon,
          endButtons: {
            onEdit: () => setShowEditTasksideOver(true),
            onDelete: () => setShowDeleteTaskModal(true),
          },
        }}
        tabs={{
          multiple: true,
          bodies: [
            {
              icon: AdjustmentsVerticalIcon as IconType,
              label: "Details",
              body: <BasicDetailList items={basicDetails} />,
            },
          ],
        }}
      />
    </>
  );
};

const useBasicDetails = (
  task: RouterOutputs["workspace"]["tasks"]["list"][0]
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this task",
      },
      field: {
        variant: "text",
        value: task.id,
      },
    },
    {
      label: {
        title: "Project ID",
        description: "The ID of the parent project",
      },
      field: {
        variant: "text",
        value: task.project?.id ?? "",
      },
    },
    {
      label: {
        title: "Project Name",
        description: "The name of the parent project",
      },
      field: {
        variant: "text",
        value: task.project?.name ?? "",
      },
    },
    {
      label: {
        title: "Name",
        description: `Descriptive name for the task, e.g. "Fix paywall issues"`,
      },
      field: {
        variant: "text",
        value: task.name ?? "",
      },
    },
    {
      label: {
        title: "Task number",
        description: "The task number, excluding the workspace prefix",
      },
      field: {
        variant: "text",
        value: task.taskNumber?.toString() ?? "",
      },
    },
  ];

  return details;
};
