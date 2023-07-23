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
import { customJSONStringify } from "@timesheeter/web/lib";

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

  const getDefaultValues = () => {
    if (data.new) {
      if (!projects[0]) {
        throw new Error("No projects available");
      }

      return {
        new: true as const,
        workspaceId,
        name: "New task",
        taskPrefixId: null,
        projectId: projects[0].id,
        config: getDefaultTaskConfig(),
      }
    }

    const { project, ticketForTask, ...rest } = data.task

    return {
      new: false as const,
      ...rest,
      projectId: project.id,
      taskPrefixId: ticketForTask?.taskPrefix?.id ?? null,
      taskNumber: ticketForTask?.number.toString(),
    };
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
      values.projectId = undefined;
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

      if (values.taskNumber === data.task.ticketForTask?.number.toString()) {
        delete values.taskNumber;
      }
    }

    // Validate form
    const result = mutationSchema.safeParse(values)

    if (!result.success) {
      addNotification({
        variant: "error",
        primaryText: `Failed to ${data.new ? "create" : "update"} task`,
        secondaryText: fromZodError(result.error).message,
      });
      return;
    }
    console.log(values)
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
  if (!projects[0]) {
    throw new Error("No projects available");
  }

  const projectIdFormItem: BasicFormItemProps<true> = {
    required: true,
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
        onChange: async (value) => {
          methods.setValue("taskPrefixId", null);

          methods.setValue("taskNumber", null);

          methods.setValue("projectId", value)

          await methods.trigger("taskPrefixId")
          await methods.trigger("taskNumber")
          await methods.trigger("projectId")
        },
        active: methods.getValues("projectId") ?? projects[0].id,
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
        title: "Task Prefix",
        description: `The prefix for the task, e.g. "AC"`,
      },
      field: {
        variant: "select",
        select: {
          options: projects.find(
            ({ id }) => id === methods.getValues("projectId")
          )?.taskPrefixes.map(({ id, prefix }) => ({
            value: id,
            label: prefix
          })) ?? [],
          active: methods.getValues("taskPrefixId") ?? null,
          onChange: (value) => {
            methods.setValue("taskPrefixId", value, {
              shouldValidate: true,
            });
          }
        }
      },
    },
    {
      required: false,
      label: {
        title: "Task number",
        description: "The task number, excluding the workspace prefix",
      },
      field: {
        variant: methods.getValues("projectId") ? "number" : "hidden",
        register: methods.register("taskNumber"),
        // @ts-expect-error - variant type based on projectId
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
