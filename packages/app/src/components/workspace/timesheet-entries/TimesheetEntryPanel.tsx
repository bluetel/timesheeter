import { TimesheetEntryIcon } from "@timesheeter/app/lib/workspace/timesheet-entries";
import { EditTimesheetEntrySideOver } from "./EditTimesheetEntrySideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";
import { DeleteTimesheetEntryModal } from "./DeleteTimesheetEntryModal";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";
import { TIMESHEET_ENTRIES_HELP_TEXT } from "@timesheeter/app/lib";

type TimesheetEntryDetailProps = {
  timesheetEntry: RouterOutputs["workspace"]["timesheetEntries"]["list"][number];
  refetchTimesheetEntries: () => unknown;
  onNewTimesheetEntryClick: () => void;
  tasks: RouterOutputs["workspace"]["tasks"]["listMinimal"];
};

export const TimesheetEntryPanel = ({
  timesheetEntry,
  refetchTimesheetEntries,
  onNewTimesheetEntryClick,
  tasks,
}: TimesheetEntryDetailProps) => {
  const [showEditTimesheetEntrySideOver, setShowEditTimesheetEntrySideOver] =
    useState(false);
  const [showDeleteTimesheetEntryModal, setShowDeleteTimesheetEntryModal] =
    useState(false);

  const basicDetails = useBasicDetails(timesheetEntry);

  return (
    <>
      <DeleteTimesheetEntryModal
        timesheetEntry={timesheetEntry}
        onClose={() => setShowDeleteTimesheetEntryModal(false)}
        show={showDeleteTimesheetEntryModal}
        refetchTimesheetEntries={refetchTimesheetEntries}
      />
      <EditTimesheetEntrySideOver
        show={showEditTimesheetEntrySideOver}
        onClose={() => setShowEditTimesheetEntrySideOver(false)}
        refetchTimesheetEntries={refetchTimesheetEntries}
        data={{
          new: false,
          timesheetEntry,
        }}
        workspaceId={timesheetEntry.workspaceId}
        tasks={tasks}
      />
      <DetailPanel
        header={{
          title: "Timesheet Entries",
          description: TIMESHEET_ENTRIES_HELP_TEXT,
          newButton: {
            label: "New timesheet entry",
            onClick: onNewTimesheetEntryClick,
          },
        }}
        content={{
          name: timesheetEntry.description,
          description: `${
            INTEGRATION_DEFINITIONS[timesheetEntry.config.type].name
          } • ${
            INTEGRATION_DEFINITIONS[timesheetEntry.config.type].description
          }`,
          icon: TimesheetEntryIcon,
          endButtons: {
            onEdit: () => setShowEditTimesheetEntrySideOver(true),
            onDelete: () => setShowDeleteTimesheetEntryModal(true),
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
  timesheetEntry: RouterOutputs["workspace"]["timesheetEntries"]["list"][0]
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this timesheet entry",
      },
      field: {
        variant: "text",
        value: timesheetEntry.id,
      },
    },
    {
      label: {
        title: "Task ID",
        description: "The ID of the parent task",
      },
      field: {
        variant: "text",
        value: timesheetEntry.task?.id ?? "",
      },
    },
    {
      label: {
        title: "Task Name",
        description: "The name of the parent task",
      },
      field: {
        variant: "text",
        value: timesheetEntry.task?.name ?? "",
      },
    },
    {
      label: {
        title: "Description",
        description: `Description for this timesheet entry e.g. "Implementing new Nav API"`,
      },
      field: {
        variant: "text",
        value: timesheetEntry.description ?? "",
      },
    },
  ];

  return details;
};
