import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { DeleteConfirmationModal } from "@timesheeter/app/components/ui/DeleteConfirmationModal";

type DeleteTimesheetEntryModalProps = {
  show: boolean;
  onClose: () => void;
  timesheetEntry: RouterOutputs["workspace"]["timesheetEntries"]["list"]["data"][number];
  refetchTimesheetEntries: () => void;
};

export const DeleteTimesheetEntryModal = ({
  show,
  onClose,
  timesheetEntry,
  refetchTimesheetEntries,
}: DeleteTimesheetEntryModalProps) => {
  const deleteMutation = api.workspace.timesheetEntries.delete.useMutation({
    onSuccess: () => {
      void refetchTimesheetEntries();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete timesheet entry"
      description="Are you sure you want to delete this timesheet entry?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: timesheetEntry.id,
          workspaceId: timesheetEntry.workspaceId,
        });
      }}
    />
  );
};
