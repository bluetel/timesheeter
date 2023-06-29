import { useZodForm } from "@timesheeter/app/utils/zod-form";
import {
  createHolidaySchema,
  updateHolidaySchema,
} from "@timesheeter/app/lib/workspace/holidays";
import { api, type RouterOutputs } from "@timesheeter/app/utils/api";
import { useEffect, useState } from "react";
import { HOLIDAYS_HELP_TEXT } from "@timesheeter/app/lib/workspace/holidays";
import { z } from "zod";
import { SideOver } from "@timesheeter/app/components/ui/SideOver";
import { BasicForm } from "@timesheeter/app/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/app/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from "zod-validation-error";

const mutationSchema = z.union([
  createHolidaySchema.extend({
    new: z.literal(true),
  }),
  updateHolidaySchema.extend({
    new: z.literal(false),
  }),
]);

type EditHolidaySideOverProps = {
  refetchHolidays: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
    | {
        new: true;
      }
    | {
        new: false;
        holiday: RouterOutputs["workspace"]["holidays"]["list"][0];
      };
  workspaceId: string;
};

export const EditHolidaySideOver = ({
  refetchHolidays,
  show,
  onClose,
  data,
  workspaceId,
}: EditHolidaySideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
          new: true as const,
          workspaceId,
          name: "New holiday",
        }
      : {
          new: false as const,
          ...data.holiday,
        };

  const methods = useZodForm({
    schema: mutationSchema,
    defaultValues: getDefaultValues(),
  });

  const [oldData, setOldData] = useState(data);

  // Prevents resetting wrongly if just different reference
  useEffect(() => {
    if (JSON.stringify(oldData) === JSON.stringify(data)) {
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
      refetchHolidays();
      handleClose();
    },
  };

  const { mutate: createHoliday } =
    api.workspace.holidays.create.useMutation(mutationArgs);

  const { mutate: updateHoliday } =
    api.workspace.holidays.update.useMutation(mutationArgs);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let values = methods.getValues();

    if (!values.description) {
      values.description = null;
    }

    // If just updating, filter out the values that are not changed
    if (!data.new) {
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
        primaryText: `Failed to ${data.new ? "create" : "update"} holiday`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new
      ? createHoliday(values, {
          onError: (error) => {
            addNotification({
              variant: "error",
              primaryText: "Failed to create holiday",
              secondaryText: error.message,
            });
          },
        })
      : updateHoliday(values, {
          onError: (error) => {
            addNotification({
              variant: "error",
              primaryText: "Failed to update holiday",
              secondaryText: error.message,
            });
          },
        });
  };

  const fields = useHolidayFields(methods);

  return (
    <SideOver
      title={data.new ? "Create Holiday" : "Edit Holiday"}
      description={HOLIDAYS_HELP_TEXT}
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

const useHolidayFields = (
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>
) => {
  const fields: BasicFormItemProps[] = [
    {
      required: false,
      label: {
        title: "Description",
        description: `Descriptive name for the holiday, e.g. "Paid Leave - Graduation"`,
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
        description:
          "Date of the start of the holiday, can include weekends, e.g. 22/07/2023",
      },
      field: {
        variant: "date",
        value: methods.getValues("start") ?? null,
        onChange: (value) => {
          methods.setValue("start", value ?? undefined, {
            shouldValidate: true,
          });
        },
        error: methods.formState.errors.start,
        formId: "holiday-sideover-start",
      },
    },
    {
      required: true,
      label: {
        title: "End",
        description:
          "Date of the end of the holiday, can include weekends, e.g. 31/07/2023",
      },
      field: {
        variant: "date",
        value: methods.getValues("end") ?? null,
        onChange: (value) => {
          methods.setValue("end", value ?? undefined, {
            shouldValidate: true,
          });
        },
        error: methods.formState.errors.end,
        formId: "holiday-sideover-end",
      },
    },
  ];

  return fields;
};
