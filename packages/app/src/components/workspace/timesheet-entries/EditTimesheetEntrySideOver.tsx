import { useZodForm } from "@timesheeter/app/utils/zod-form";
import {
  createTimesheetEntrySchema,
  updateTimesheetEntrySchema,
  getDefaultTimesheetEntryConfig,
  TIMESHEET_ENTRIES_HELP_TEXT,
} from "@timesheeter/app/lib/workspace/timesheet-entries";
import { api, type RouterOutputs } from "@timesheeter/app/utils/api";
import React, { useEffect } from "react";
import { z } from "zod";
import { SideOver } from "@timesheeter/app/components/ui/SideOver";
import { BasicForm } from "@timesheeter/app/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/app/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from "zod-validation-error";

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
        integration: RouterOutputs["workspace"]["timesheetEntries"]["list"][0];
      };
  workspaceId: string;
  tasks: RouterOutputs["workspace"]["tasks"]["listMinimal"];
};

export const EditTimesheetEntrySideOver = ({
  refetchTimesheetEntries,
  show,
  onClose,
  data,
  workspaceId,
  tasks,
}: EditTimesheetEntrySideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
          new: true as const,
          workspaceId,
          name: "New integration",
          config: getDefaultTimesheetEntryConfig(),
        }
      : {
          new: false as const,
          ...data.integration,
        };

  const methods = useZodForm({
    schema: mutationSchema,
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    methods.reset(getDefaultValues());
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

    // If just updating, filter out the values that are not changed
    if (!data.new) {
      const { integration } = data;

      values = {
        ...values,
        config: {
          ...(Object.fromEntries(
            Object.entries(values.config ?? {}).filter(
              ([key, value]) =>
                (integration.config as Record<string, unknown>)[key] !== value
            )
          ) as (typeof values)["config"]),
          type: values.config.type ?? integration.config.type,
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
        primaryText: `Failed to ${data.new ? "create" : "update"} integration`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new
      ? createTimesheetEntry(values, {
          onError: (error) => {
            addNotification({
              variant: "error",
              primaryText: "Failed to create integration",
              secondaryText: error.message,
            });
          },
        })
      : updateTimesheetEntry(values, {
          onError: (error) => {
            addNotification({
              variant: "error",
              primaryText: "Failed to update integration",
              secondaryText: error.message,
            });
          },
        });
  };

  const fields = useTimesheetEntryFields(methods, tasks);

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
  tasks: RouterOutputs["workspace"]["tasks"]["listMinimal"]
) => {
  const fields: BasicFormItemProps[] = [
    {
      required: true,
      label: {
        title: "Task",
        description: "The task that this timesheet entry belongs to",
      },
      field: {
        variant: "select",
        error: methods.formState.errors.taskId,
        select: {
          options: tasks.map(({ id, name }) => ({
            value: id,
            label: name ?? "Unnamed task",
          })),
          onChange: (value) =>
            methods.setValue("taskId", value, {
              shouldValidate: true,
            }),
          active: methods.getValues("taskId") ?? null,
        },
      },
    },
    {
      required: false,
      label: {
        title: "Timesheet entry description",
        description: `Custom description for this timesheet entry e.g. "Meeting to discuss implementation"`,
      },
      field: {
        variant: "text",
        register: methods.register("description"),
        error: methods.formState.errors.description,
      },
    },
  ];

  return fields;
};
