import { type RouterOutputs, api } from "@timesheeter/web/utils/api";
import { DeleteConfirmationModal } from "@timesheeter/web/components/ui/DeleteConfirmationModal";

type DeleteTaskModalProps = {
  show: boolean;
  onClose: () => void;
  task: RouterOutputs["workspace"]["tasks"]["list"]["data"][number];
  refetchTasks: () => void;
};

export const DeleteTaskModal = ({
  show,
  onClose,
  task,
  refetchTasks,
}: DeleteTaskModalProps) => {
  const deleteMutation = api.workspace.tasks.delete.useMutation({
    onSuccess: () => {
      void refetchTasks();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete task"
      description="Are you sure you want to delete this task?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: task.id,
          workspaceId: task.workspaceId,
        });
      }}
    />
  );
};
