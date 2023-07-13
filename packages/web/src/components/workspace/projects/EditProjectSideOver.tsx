import { useZodForm } from "@timesheeter/web/utils/zod-form";
import {
  createProjectSchema,
  updateProjectSchema,
  getDefaultProjectConfig,
  autoAssignTasksHelpText,
} from "@timesheeter/web/lib/workspace/projects";
import { api, type RouterOutputs } from "@timesheeter/web/utils/api";
import { useEffect, useState } from "react";
import { PROJECTS_HELP_TEXT } from "@timesheeter/web/lib/workspace/projects";
import { z } from "zod";
import { SideOver } from "@timesheeter/web/components/ui/SideOver";
import { BasicForm } from "@timesheeter/web/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/web/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from "zod-validation-error";
import { ListableForm } from "../../ui/forms/BasicForm/ListableForm";
import {
  AdjustmentsVerticalIcon,
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/outline";
import { type IconType } from "react-icons/lib";

const mutationSchema = z.union([
  createProjectSchema.extend({
    new: z.literal(true),
  }),
  updateProjectSchema.extend({
    new: z.literal(false),
  }),
]);

type EditProjectSideOverProps = {
  refetchProjects: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
  | {
    new: true;
  }
  | {
    new: false;
    project: RouterOutputs["workspace"]["projects"]["list"][0];
  };
  workspaceId: string;
};

export const EditProjectSideOver = ({
  refetchProjects,
  show,
  onClose,
  data,
  workspaceId,
}: EditProjectSideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
        new: true as const,
        workspaceId,
        name: "New project",
        config: getDefaultProjectConfig(),
      }
      : {
        new: false as const,
        ...data.project,
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
      refetchProjects();
      handleClose();
    },
  };

  const { mutate: createProject } =
    api.workspace.projects.create.useMutation(mutationArgs);

  const { mutate: updateProject } =
    api.workspace.projects.update.useMutation(mutationArgs);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let values = methods.getValues();

    // If just updating, filter out the values that are not changed
    if (!data.new) {
      const { project } = data;

      values = {
        ...values,
        config: {
          ...(Object.fromEntries(
            Object.entries(values.config ?? {}).filter(
              ([key, value]) =>
                (project.config as Record<string, unknown>)[key] !== value
            )
          ) as (typeof values)["config"]),
          type: values.config.type ?? project.config.type,
        },
      } as typeof values;

      // Filter out undefined values
      values = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined)
      ) as typeof values;
    }

    // Filter out autoAssignTasks if it's empty
    values.config.autoAssignTasks =
      values.config.autoAssignTasks?.filter((task) => task !== "") ?? [];

    if (values.taskPrefix === "") {
      values.taskPrefix = null;
    }

    // Validate form
    const result = mutationSchema.safeParse(values);

    if (!result.success) {
      addNotification({
        variant: "error",
        primaryText: `Failed to ${data.new ? "create" : "update"} project`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new
      ? createProject(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to create project",
            secondaryText: error.message,
          });
        },
      })
      : updateProject(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to update project",
            secondaryText: error.message,
          });
        },
      });
  };

  const fields = useProjectFields(methods);

  const getAutoAssignTasks = () => {
    const tasks = methods.getValues("config.autoAssignTasks") ?? [];

    if (tasks.length === 0) {
      return [""];
    }

    return tasks;
  };

  return (
    <SideOver
      title={data.new ? "Create Project" : "Edit Project"}
      description={PROJECTS_HELP_TEXT}
      show={show}
      onClose={handleClose}
      actionButtonLabel={data.new ? "Create" : "Update"}
      onFormSubmit={handleSubmit}
      tabs={{
        multiple: true,
        bodies: [
          {
            icon: AdjustmentsVerticalIcon as IconType,
            label: "Details",
            body: <BasicForm items={fields} />,
          },
          {
            icon: ArrowPathRoundedSquareIcon as IconType,
            label: "Auto Assign Tasks",
            body: (
              <ListableForm
                values={getAutoAssignTasks()}
                onChange={(newValues) =>
                  methods.setValue("config.autoAssignTasks", newValues, {
                    shouldValidate: true,
                  })
                }
              />
            ),
            subDescription: autoAssignTasksHelpText,
          },
        ],
      }}
    />
  );
};

const useProjectFields = (
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>
) => {
  const fields: BasicFormItemProps[] = [
    {
      required: true,
      label: {
        title: "Project name",
        description: `Descriptive name for the project, e.g. "Acme Corp"`,
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
        description: `Prefix for tasks created by this project, e.g. "AC" for "AC-1234"`,
      },
      field: {
        variant: "text",
        register: methods.register("taskPrefix"),
        error: methods.formState.errors.taskPrefix,
      },
    },
  ];

  return fields;
};
