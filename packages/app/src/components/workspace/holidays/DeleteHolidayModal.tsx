import { api } from "@timesheeter/app/utils/api";
import type { ParsedHoliday } from "@timesheeter/app/server/api/routers/workspace/holidays";
import { DeleteConfirmationModal } from "@timesheeter/app/components/ui/DeleteConfirmationModal";

type DeleteHolidayModalProps = {
  show: boolean;
  onClose: () => void;
  holiday: ParsedHoliday;
  refetchHolidays: () => void;
};

export const DeleteHolidayModal = ({
  show,
  onClose,
  holiday,
  refetchHolidays,
}: DeleteHolidayModalProps) => {
  const deleteMutation = api.workspace.holidays.delete.useMutation({
    onSuccess: () => {
      void refetchHolidays();
    },
  });

  return (
    <DeleteConfirmationModal
      title="Delete holiday"
      description="Are you sure you want to delete this holiday?"
      show={show}
      onClose={onClose}
      onDelete={() => {
        deleteMutation.mutate({
          id: holiday.id,
          workspaceId: holiday.workspaceId,
        });
      }}
    />
  );
};
