import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { DeleteConfirmationModal } from "@timesheeter/app/components/ui/DeleteConfirmationModal";

type DeleteConnectorModalProps = {
  show: boolean;
  onClose: () => void;
  connector: RouterOutputs["workspace"]["models"]["list"][0]["connectors"][0];
  refetchModels: () => void;
};

export const DeleteConnectorModal = ({
  show,
  onClose,
  connector,
  refetchModels,
}: DeleteConnectorModalProps) => {
  const deleteMutation = api.workspace.connectors.delete.useMutation({
    onSuccess: () => {
      void refetchModels();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete connector"
      description="Are you sure you want to delete this connector?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: connector.id,
          workspaceId: connector.workspaceId,
        });
      }}
    />
  );
};
