import { useZodForm } from "@timesheeter/web/utils/zod-form";
import {
  createTimesheetEntrySchema,
  updateTimesheetEntrySchema,
  getDefaultTimesheetEntryConfig,
  TIMESHEET_ENTRIES_HELP_TEXT,
} from "@timesheeter/web/lib/workspace/timesheet-entries";
import { api, type RouterOutputs } from "@timesheeter/web/utils/api";
import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { SideOver } from "@timesheeter/web/components/ui/SideOver";
import { BasicForm } from "@timesheeter/web/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/web/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from "zod-validation-error";
import { customJSONStringify } from "@timesheeter/web/lib";

const mutationSchema = z.union([
  createTimesheetEntrySchema.extend({
    new: z.literal(true),
  }),
  updateTimesheetEntrySchema.extend({
    new: z.literal(false),
  }),
]);

type EditTimesheetEntrySideOverProps = {
  refetchTimesheetEntries: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
  | {
    new: true;
  }
  | {
    new: false;
    timesheetEntry: RouterOutputs["workspace"]["timesheetEntries"]["list"]["data"][number];
  };
  workspaceId: string;
  tasks: RouterOutputs["workspace"]["tasks"]["listMinimal"];
  defaultTaskId: string;
};

export const EditTimesheetEntrySideOver = ({
  refetchTimesheetEntries,
  show,
  onClose,
  data,
  workspaceId,
  tasks,
  defaultTaskId,
}: EditTimesheetEntrySideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
        new: true as const,
        workspaceId,
        name: "New timesheet entry",
        taskId: defaultTaskId,
        config: getDefaultTimesheetEntryConfig(),
      }
      : {
        new: false as const,
        ...data.timesheetEntry,
      };

  const methods = useZodForm({
    schema: mutationSchema,
    defaultValues: getDefaultValues(),
  });

  const [oldData, setOldData] = useState(data);

  // Prevents resetting wrongly if just different reference
  useEffect(() => {
    if (customJSONStringify(oldData) === customJSONStringify(data)) {
      return;
    }

    methods.reset(getDefaultValues());
    setOldData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleClose = () => {
    methods.reset();
    onClose();
  };

  const mutationArgs = {
    onSuccess: () => {
      refetchTimesheetEntries();
      handleClose();
    },
  };

  const { mutate: createTimesheetEntry } =
    api.workspace.timesheetEntries.create.useMutation(mutationArgs);

  const { mutate: updateTimesheetEntry } =
    api.workspace.timesheetEntries.update.useMutation(mutationArgs);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let values = methods.getValues();

    if (!values.description) {
      values.description = null;
    }

    // If just updating, filter out the values that are not changed
    if (!data.new) {
      const { timesheetEntry } = data;

      values = {
        ...values,
        config: {
          ...(Object.fromEntries(
            Object.entries(values.config ?? {}).filter(
              ([key, value]) =>
                (timesheetEntry.config as Record<string, unknown>)[key] !==
                value
            )
          ) as (typeof values)["config"]),
          type: values.config.type ?? timesheetEntry.config.type,
        },
      } as typeof values;

      // Filter out undefined values
      values = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined)
      ) as typeof values;
    }

    // Validate form
    const result = mutationSchema.safeParse(values);

    if (!result.success) {
      addNotification({
        variant: "error",
        primaryText: `Failed to ${data.new ? "create" : "update"
          } timesheet entry`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new
      ? createTimesheetEntry(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to create timesheet entry",
            secondaryText: error.message,
          });
        },
      })
      : updateTimesheetEntry(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to update timesheet entry",
            secondaryText: error.message,
          });
        },
      });
  };

  const fields = useTimesheetEntryFields(methods, tasks, defaultTaskId);

  return (
    <SideOver
      title={data.new ? "Create Timesheet Entry" : "Edit Timesheet Entry"}
      description={TIMESHEET_ENTRIES_HELP_TEXT}
      show={show}
      onClose={handleClose}
      actionButtonLabel={data.new ? "Create" : "Update"}
      onFormSubmit={handleSubmit}
      tabs={{
        multiple: false,
        body: <BasicForm items={fields} />,
      }}
    />
  );
};

const useTimesheetEntryFields = (
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>,
  tasks: RouterOutputs["workspace"]["tasks"]["listMinimal"],
  defaultTaskId: string
) => {
  const selectOptions = useMemo(() => tasks.map(({ id, name, ticketForTask }) => ({
    value: id,
    label: name ? name : ((ticketForTask?.number && ticketForTask.taskPrefix.prefix) ? `${ticketForTask.taskPrefix.prefix}-${ticketForTask.number}` : "Unnamed task"),
  })), [tasks]);

  let taskId = methods.getValues("taskId");

  if (!taskId) {
    taskId = defaultTaskId;
  }


  const taskIdFormItem: BasicFormItemProps<true> = {
    required: true,
    label: {
      title: "Task",
      description: "The task that this timesheet entry belongs to",
    },
    field: {
      variant: "select",
      error: methods.formState.errors.taskId,
      select: {
        options: selectOptions,
        onChange: (value) =>
          methods.setValue("taskId", value, {
            shouldValidate: true,
          }),
        active: taskId,
      },
    },
  };

  const fields: BasicFormItemProps[] = [
    taskIdFormItem,
    {
      required: false,
      label: {
        title: "Timesheet entry description",
        description: `Description for this timesheet entry e.g. "Implementing new Nav API"`,
      },
      field: {
        variant: "text",
        register: methods.register("description"),
        error: methods.formState.errors.description,
      },
    },
    {
      required: true,
      label: {
        title: "Start",
        description: "The date and time when this timesheet entry started",
      },
      field: {
        variant: "datetime",
        value: methods.getValues("start") ?? null,
        onChange: (value) =>
          methods.setValue("start", value ?? undefined, {
            shouldValidate: true,
          }),
        error: methods.formState.errors.start,
        formId: "timesheet-sideover-start",
      },
    },
    {
      required: true,
      label: {
        title: "End",
        description: "The date and time when this timesheet entry ended",
      },
      field: {
        variant: "datetime",
        value: methods.getValues("end") ?? null,
        onChange: (value) =>
          methods.setValue("end", value ?? undefined, {
            shouldValidate: true,
          }),
        error: methods.formState.errors.end,
        formId: "timesheet-sideover-end",
      },
    },
  ];

  return fields;
};
