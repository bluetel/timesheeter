import { RouterOutputs, api } from "@timesheeter/app/utils/api";
import { DeleteConfirmationModal } from "@timesheeter/app/components/ui/DeleteConfirmationModal";

type DeleteToolModalProps = {
  show: boolean;
  onClose: () => void;
  tool: RouterOutputs["workspace"]["tools"]["list"][0];
  refetchTools: () => void;
};

export const DeleteToolModal = ({
  show,
  onClose,
  tool,
  refetchTools,
}: DeleteToolModalProps) => {
  const deleteMutation = api.workspace.tools.delete.useMutation({
    onSuccess: () => {
      void refetchTools();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete tool"
      description="Are you sure you want to delete this tool?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: tool.id,
          workspaceId: tool.workspaceId,
        });
      }}
    />
  );
};
