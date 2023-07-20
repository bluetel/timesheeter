import { TimesheetEntryIcon } from "@timesheeter/web/lib/workspace/timesheet-entries";
import { EditTimesheetEntrySideOver } from "./EditTimesheetEntrySideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/web/components/ui/DetailPanel/DetailPanel";
import { DeleteTimesheetEntryModal } from "./DeleteTimesheetEntryModal";
import { type RouterOutputs } from "@timesheeter/web/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/web/components/ui/DetailPanel/BasicDetailList";
import { TIMESHEET_ENTRIES_HELP_TEXT } from "@timesheeter/web/lib";

type TimesheetEntryDetailProps = {
  timesheetEntry: RouterOutputs["workspace"]["timesheetEntries"]["list"]["data"][number];
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

  const getSubDescription = () => {
    if (
      timesheetEntry.task.ticketForTask
    ) {
      return `${timesheetEntry.task.ticketForTask.taskPrefix.prefix}-${timesheetEntry.task.ticketForTask.number}`;
    }

    if (timesheetEntry.task.name) {
      return timesheetEntry.task.name;
    }

    return undefined;
  };

  const subDescription = getSubDescription();

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
        defaultTaskId={timesheetEntry.task.id}
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
          name: timesheetEntry.description ?? subDescription ?? "Unnamed entry",
          description: timesheetEntry.description ? subDescription : undefined,
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
  timesheetEntry: RouterOutputs["workspace"]["timesheetEntries"]["list"]["data"][number]
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
    {
      label: {
        title: "Start",
        description: "The date and time when this timesheet entry started",
      },
      field: {
        variant: "text",
        value: timesheetEntry.start.toLocaleString("en-GB"),
      },
    },
    {
      label: {
        title: "End",
        description: "The date and time when this timesheet entry ended",
      },
      field: {
        variant: "text",
        value: timesheetEntry.end.toLocaleString("en-GB"),
      },
    },
  ];

  return details;
};
