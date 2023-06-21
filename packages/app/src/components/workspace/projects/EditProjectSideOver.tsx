import { useZodForm } from "@timesheeter/app/utils/zod-form";
import {
  createProjectSchema,
  updateProjectSchema,
  getDefaultProjectConfig,
  autoAssignTasksHelpText,
} from "@timesheeter/app/lib/workspace/projects";
import { api, type RouterOutputs } from "@timesheeter/app/utils/api";
import { useEffect } from "react";
import { PROJECTS_HELP_TEXT } from "@timesheeter/app/lib/workspace/projects";
import { z } from "zod";
import { SideOver } from "@timesheeter/app/components/ui/SideOver";
import { BasicForm } from "@timesheeter/app/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/app/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from 'zod-validation-error';
import { ListableForm } from "../../ui/forms/BasicForm/ListableForm";
import { AdjustmentsVerticalIcon, ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import { type IconType } from "react-icons/lib";

const mutationSchema = z.union([
  createProjectSchema.extend({
    new: z.literal(true),
  }),
  updateProjectSchema.extend({
    new: z.literal(false),
  }),
]);

type EditProjectsideOverProps = {
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
}: EditProjectsideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
        new: true as const,
        workspaceId,
        name: "New Project",
        config: getDefaultProjectConfig(),
      }
      : {
        new: false as const,
        ...data.project,
      }

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
          ...Object.fromEntries(
            Object.entries(values.config ?? {}).filter(
              ([key, value]) => (project.config as Record<string, unknown>)[key] !== value
            )) as typeof values["config"],
          type: values.config.type ?? project.config.type,
        },
      } as typeof values;

      // Filter out undefined values
      values = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined)
      ) as typeof values;

      // Filter out autoAssignTasks if it's empty
      values.config.autoAssignTasks = values.config.autoAssignTasks?.filter((task) => task !== "") ?? []
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

    values.new ? createProject(values, {
      onError: (error) => {
        addNotification({
          variant: "error",
          primaryText: "Failed to create project",
          secondaryText: error.message,
        });
      }
    }) : updateProject(values, {
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
            body: <ListableForm values={methods.getValues("config.autoAssignTasks") ?? []} onChange={async (newValues) => {
              methods.setValue("config.autoAssignTasks", newValues)

              // Force re-render
              await methods.trigger("config");
              methods.clearErrors("config");
            }} />,
            subDescription: autoAssignTasksHelpText,
          }
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
        description:
          `Descriptive name for the project, e.g. "James's Toggl"`
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
        description:
          `Prefix for tasks created by this project, e.g. "NA" for "NA-1234"`
      },
      field: {
        variant: "text",
        register: methods.register("taskPrefix"),
        error: methods.formState.errors.taskPrefix,
      },
    }
  ];

  // const projectConfig =
  //   PROJECT_DEFINITIONS[methods.getValues("config.type")];

  // projectConfig.fields.forEach((field) => {
  //   // TODO: Handle field errors
  //   // const error = methods.formState.errors.config?.[field.accessor as keyof typeof methods.formState.errors.config];

  //   // Skip auto assign tasks field
  //   if (field.accessor === "autoAssignTasks") {
  //     return;
  //   }

  //   fields.push({
  //     required: field.required,
  //     label: {
  //       title: field.name,
  //       description: field.description,
  //     },
  //     field: {
  //       variant: "text",
  //       register: methods.register(`config.${field.accessor}`),
  //       //error: typeof error === "string" ? new FieldError(error) : error,
  //     },
  //   });
  //});

  return fields;
};
