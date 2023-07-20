import { useZodForm } from "@timesheeter/web/utils/zod-form";
import {
  createTaskSchema,
  updateTaskSchema,
  getDefaultTaskConfig,
} from "@timesheeter/web/lib/workspace/tasks";
import { api, type RouterOutputs } from "@timesheeter/web/utils/api";
import { useEffect, useState } from "react";
import { TASKS_HELP_TEXT } from "@timesheeter/web/lib/workspace/tasks";
import { z } from "zod";
import { SideOver } from "@timesheeter/web/components/ui/SideOver";
import { BasicForm } from "@timesheeter/web/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/web/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from "zod-validation-error";

const mutationSchema = z.union([
  z.intersection(
    createTaskSchema,
    z.object({
      new: z.literal(true),
    })
  ),
  z.intersection(
    updateTaskSchema,
    z.object({
      new: z.literal(false),
    })
  ),
]);

type EditTaskSideOverProps = {
  refetchTasks: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
  | {
    new: true;
  }
  | {
    new: false;
    task: RouterOutputs["workspace"]["tasks"]["list"]["data"][number];
  };
  workspaceId: string;
  projects: RouterOutputs["workspace"]["projects"]["listMinimal"];
};

export const EditTaskSideOver = ({
  refetchTasks,
  show,
  onClose,
  data,
  workspaceId,
  projects,
}: EditTaskSideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
        new: true as const,
        workspaceId,
        name: "New task",
        config: getDefaultTaskConfig(),
      }
      : {
        new: false as const,
        ...data.task,
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
      refetchTasks();
      handleClose();
    },
  };

  const { mutate: createTask } =
    api.workspace.tasks.create.useMutation(mutationArgs);

  const { mutate: updateTask } =
    api.workspace.tasks.update.useMutation(mutationArgs);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let values = methods.getValues();

    if (!values.projectId) {
      values.projectId = null;
    }

    if (values.taskNumber) {
      values.taskNumber = Number(values.taskNumber);
    } else {
      values.taskNumber = null;
    }

    // If just updating, filter out the values that are not changed
    if (!data.new) {
      const { task } = data;

      values = {
        ...values,
        config: {
          ...(Object.fromEntries(
            Object.entries(values.config ?? {}).filter(
              ([key, value]) =>
                (task.config as Record<string, unknown>)[key] !== value
            )
          ) as (typeof values)["config"]),
          type: values.config.type ?? task.config.type,
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
        primaryText: `Failed to ${data.new ? "create" : "update"} task`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new
      ? createTask(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to create task",
            secondaryText: error.message,
          });
        },
      })
      : updateTask(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to update task",
            secondaryText: error.message,
          });
        },
      });
  };

  const fields = useTaskFields(methods, projects);

  return (
    <SideOver
      title={data.new ? "Create Task" : "Edit Task"}
      description={TASKS_HELP_TEXT}
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

const useTaskFields = (
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>,
  projects: RouterOutputs["workspace"]["projects"]["listMinimal"]
) => {
  const projectIdFormItem: BasicFormItemProps<false> = {
    required: false,
    label: {
      title: "Project",
      description: "The project that this task belongs to",
    },
    field: {
      variant: "select",
      error: methods.formState.errors.projectId,
      select: {
        options: projects.map(({ id, name }) => ({
          value: id,
          label: name ?? "Unnamed project",
        })),
        onChange: (value) =>
          methods.setValue("projectId", value, {
            shouldValidate: true,
          }),
        active: methods.getValues("projectId") ?? null,
      },
    },
  };

  const fields: BasicFormItemProps[] = [
    projectIdFormItem,
    {
      required: false,
      label: {
        title: "Task name",
        description: `Descriptive name for the task, e.g. "Fix paywall issues"`,
      },
      field: {
        variant: "text",
        register: methods.register("name"),
        error: methods.formState.errors.name,
      },
    },
    {
      required: false,
      label: {
        title: "Task number",
        description: "The task number, excluding the workspace prefix",
      },
      field: {
        variant: "number",
        register: methods.register("taskNumber"),
        error: methods.formState.errors.taskNumber,
      },
    },
    // Hidden as unsure if this feature will be used
    // {
    //   required: true,
    //   label: {
    //     title: "Private Task",
    //     description: "Whether this task is private and scoped to the user who set it as private",
    //   },
    //   field: {
    //     variant: "checkbox",
    //     checked: methods.getValues("scoped") ?? false,
    //     onChange: (checked) => {
    //       methods.setValue("scoped", checked, {
    //         shouldValidate: true,
    //       });
    //     },
    //     error: methods.formState.errors.scoped,
    //   },
    // }
  ];

  return fields;
};
