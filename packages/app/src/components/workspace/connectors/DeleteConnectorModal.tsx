import { api } from "@timesheeter/app/utils/api";
import type { ParsedConnector } from "@timesheeter/app/server/api/routers/workspace/connectors";
import { DeleteConfirmationModal } from "@timesheeter/app/components/ui/DeleteConfirmationModal";

type DeleteConnectorModalProps = {
  show: boolean;
  onClose: () => void;
  connector: ParsedConnector;
  refetchConnectors: () => void;
};

export const DeleteConnectorModal = ({
  show,
  onClose,
  connector,
  refetchConnectors,
}: DeleteConnectorModalProps) => {
  const deleteMutation = api.workspace.connectors.delete.useMutation({
    onSuccess: () => {
      void refetchConnectors();
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
