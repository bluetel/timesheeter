import { useZodForm } from "@timesheeter/web/utils/zod-form";
import {
  createProjectSchema,
  updateProjectSchema,
  getDefaultProjectConfig,
  autoAssignTasksHelpText,
  autoAssignTaskSchema,
  taskPrefixesHelpText,
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
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/outline";
import { type IconType } from "react-icons/lib";
import { ConfigIcon } from "@timesheeter/web/lib/icons";
import { SiJira } from "react-icons/si";
import { customJSONStringify } from "@timesheeter/web/lib";

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

  const getDefaultValues = () => {
    if (data.new) {
      return {
        new: true as const,
        workspaceId,
        name: "New project",
        config: getDefaultProjectConfig(),
      }
    }

    const { taskPrefixes, ...project } = data.project;

    return {
      new: false as const,
      ...project,
      taskPrefixes: taskPrefixes.map(({ prefix }) => prefix),
    };
  }

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

  const getTaskPrefixes = () => {
    const taskPrefixes = [...methods.getValues("config.taskPrefixes") ?? []];

    if (taskPrefixes.length === 0) {
      taskPrefixes.push("");
    }

    return taskPrefixes;
  };

  const getAutoAssignTasks = () => {
    const tasks = [...methods.getValues("config.autoAssignTasks") ?? []]

    if (tasks.length === 0) {
      tasks.push("");
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
            icon: ConfigIcon,
            label: "Config",
            body: <BasicForm items={fields} />,
          },
          {
            icon: SiJira,
            label: "Task Prefixes",
            body: <ListableForm
              minRows={1}
              placeholder="E.g. AC"
              values={getTaskPrefixes()}
              onChange={(newValues) => {
                const filteredValues = newValues.filter((value) => value !== "");

                methods.setValue("config.taskPrefixes", filteredValues, {
                  shouldValidate: true,
                })
              }}
            />,
            subDescription: taskPrefixesHelpText
          },
          {
            icon: ArrowPathRoundedSquareIcon as IconType,
            label: "Auto Assign Tasks",
            body: <ListableForm
              minRows={1}
              placeholder="E.g. Standup"
              values={getAutoAssignTasks()}
              onChange={(newValues) => {
                // Filter out autoAssignTasks that are invalid i.e. blank ones
                const filteredValues = newValues.filter((value) => autoAssignTaskSchema.safeParse(value).success);

                methods.setValue("config.autoAssignTasks", filteredValues, {
                  shouldValidate: true,
                })
              }
              }
            />,
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
  ];

  return fields;
};
