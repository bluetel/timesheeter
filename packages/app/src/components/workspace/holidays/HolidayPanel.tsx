import { HolidayIcon } from "@timesheeter/app/lib/workspace/holidays";
import { EditHolidaySideOver } from "./EditHolidaySideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";
import { DeleteHolidayModal } from "./DeleteHolidayModal";
import { HOLIDAYS_HELP_TEXT } from "@timesheeter/app/lib/workspace/holidays";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";
import { type Holiday } from "@prisma/client";

type HolidayDetailProps = {
  holiday: Holiday;
  refetchHolidays: () => unknown;
  onNewHolidayClick: () => void;
};

export const HolidayPanel = ({
  holiday,
  refetchHolidays,
  onNewHolidayClick,
}: HolidayDetailProps) => {
  const [showEditHolidaySideOver, setShowEditHolidaySideOver] = useState(false);
  const [showDeleteHolidayModal, setShowDeleteHolidayModal] = useState(false);

  const basicDetails = useBasicDetails(holiday);

  return (
    <>
      <DeleteHolidayModal
        holiday={holiday}
        onClose={() => setShowDeleteHolidayModal(false)}
        show={showDeleteHolidayModal}
        refetchHolidays={refetchHolidays}
      />
      <EditHolidaySideOver
        show={showEditHolidaySideOver}
        onClose={() => setShowEditHolidaySideOver(false)}
        refetchHolidays={refetchHolidays}
        data={{
          new: false,
          holiday,
        }}
        workspaceId={holiday.workspaceId}
      />
      <DetailPanel
        header={{
          title: "Holidays",
          description: HOLIDAYS_HELP_TEXT,
          newButton: {
            label: "New holiday",
            onClick: onNewHolidayClick,
          },
        }}
        content={{
          name: holiday.description,
          icon: HolidayIcon,
          endButtons: {
            onEdit: () => setShowEditHolidaySideOver(true),
            onDelete: () => setShowDeleteHolidayModal(true),
          },
        }}
        tabs={{
          multiple: false,
          body: <BasicDetailList items={basicDetails} />,
        }}
      />
    </>
  );
};

const useBasicDetails = (
  holiday: RouterOutputs["workspace"]["holidays"]["list"][0]
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this holiday",
      },
      field: {
        variant: "text",
        value: holiday.id,
      },
    },
    {
      label: {
        title: "Name",
        description: `Descriptive name for the holiday, e.g. "Paid Leave - Graduation"`,
      },
      field: {
        variant: "text",
        value: holiday.description,
      },
    },
    {
      label: {
        title: "Start",
        description:
          "Date of the start of the holiday, can include weekends, e.g. 22/07/2023",
      },
      field: {
        variant: "text",
        value: holiday.start,
      },
    },
    {
      label: {
        title: "End",
        description:
          "Date of the end of the holiday, can include weekends, e.g. 31/07/2023",
      },
      field: {
        variant: "text",
        value: holiday.end,
      },
    },
  ];

  return details;
};
