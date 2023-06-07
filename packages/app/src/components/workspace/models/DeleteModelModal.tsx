import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { DeleteConfirmationModal } from "@timesheeter/app/components/ui/DeleteConfirmationModal";

type DeleteModelModalProps = {
  show: boolean;
  onClose: () => void;
  model: RouterOutputs["workspace"]["models"]["list"][0];
  refetchModels: () => void;
};

export const DeleteModelModal = ({
  show,
  onClose,
  model,
  refetchModels,
}: DeleteModelModalProps) => {
  const deleteMutation = api.workspace.models.delete.useMutation({
    onSuccess: () => {
      void refetchModels();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete model"
      description="Are you sure you want to delete this model?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: model.id,
          workspaceId: model.workspaceId,
        });
      }}
    />
  );
};
