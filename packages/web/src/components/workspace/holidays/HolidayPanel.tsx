import { EditHolidaySideOver } from "./EditHolidaySideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/web/components/ui/DetailPanel/DetailPanel";
import { DeleteHolidayModal } from "./DeleteHolidayModal";
import { HOLIDAYS_HELP_TEXT, HolidayIcon } from "@timesheeter/web/lib/workspace/holidays";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/web/components/ui/DetailPanel/BasicDetailList";
import { type Holiday } from "@prisma/client";
import { type RouterOutputs } from "@timesheeter/web/utils/api";

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
          name:
            holiday.description ??
            `${holiday.start.toLocaleDateString(
              "en-GB"
            )} - ${holiday.end.toLocaleDateString("en-GB")}`,
          description: holiday.description
            ? `${holiday.start.toLocaleDateString(
              "en-GB"
            )} - ${holiday.end.toLocaleDateString("en-GB")}`
            : undefined,
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
        title: "Description",
        description: `Descriptive for the holiday, e.g. "Paid Leave - Graduation"`,
      },
      field: {
        variant: "text",
        value: holiday.description ?? "",
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
        // Convert to pretty date and time
        value: holiday.start.toLocaleDateString("en-GB"),
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
        value: holiday.end.toLocaleDateString("en-GB"),
      },
    },
  ];

  return details;
};
