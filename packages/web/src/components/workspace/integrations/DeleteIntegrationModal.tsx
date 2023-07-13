import { api } from "@timesheeter/web/utils/api";
import type { ParsedIntegration } from "@timesheeter/web/server/api/routers/workspace/integrations";
import { DeleteConfirmationModal } from "@timesheeter/web/components/ui/DeleteConfirmationModal";

type DeleteIntegrationModalProps = {
  show: boolean;
  onClose: () => void;
  integration: ParsedIntegration;
  refetchIntegrations: () => void;
};

export const DeleteIntegrationModal = ({
  show,
  onClose,
  integration,
  refetchIntegrations,
}: DeleteIntegrationModalProps) => {
  const deleteMutation = api.workspace.integrations.delete.useMutation({
    onSuccess: () => {
      void refetchIntegrations();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete integration"
      description="Are you sure you want to delete this integration?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: integration.id,
          workspaceId: integration.workspaceId,
        });
      }}
    />
  );
};
