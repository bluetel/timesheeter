import { api } from "@timesheeter/web/utils/api";
import type { ParsedProject } from "@timesheeter/web/server/api/routers/workspace/projects";
import { DeleteConfirmationModal } from "@timesheeter/web/components/ui/DeleteConfirmationModal";

type DeleteProjectModalProps = {
  show: boolean;
  onClose: () => void;
  project: ParsedProject
  refetchProjects: () => void;
};

export const DeleteProjectModal = ({
  show,
  onClose,
  project,
  refetchProjects,
}: DeleteProjectModalProps) => {
  const deleteMutation = api.workspace.projects.delete.useMutation({
    onSuccess: () => {
      void refetchProjects();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete project"
      description="Are you sure you want to delete this project?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: project.id,
          workspaceId: project.workspaceId,
        });
      }}
    />
  );
};
