import { useZodForm } from "@timesheeter/app/utils/zod-form";
import {
  createToolSchema,
  updateToolSchema,
  TOOL_DEFINITIONS,
  getDefaultConfig,
  type ToolVariant,
} from "@timesheeter/app/lib/workspace/tools";
import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { z } from "zod";
import { SideOver } from "@timesheeter/app/components/ui/SideOver";
import { TOOLS_HELP_TEXT } from "@timesheeter/app/lib/workspace/tools";
import { type BasicFormItemProps } from "@timesheeter/app/components/ui/forms/BasicForm/BasicFormItem";
import { BasicForm } from "@timesheeter/app/components/ui/forms/BasicForm";
import { type FieldError } from "react-hook-form";
import { useEffect } from "react";

const mutationSchema = z.union([
  createToolSchema.extend({
    new: z.literal(true),
  }),
  updateToolSchema.extend({
    new: z.literal(false),
  }),
]);

type EditToolSideOverProps = {
  refetchTools: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
    | {
        new: true;
      }
    | {
        new: false;
        tool: RouterOutputs["workspace"]["tools"]["list"][0];
      };
  workspaceId: string;
};

export const EditToolSideOver = ({
  refetchTools,
  show,
  onClose,
  data,
  workspaceId,
}: EditToolSideOverProps) => {
  const getDefaultValues = () =>
    data.new
      ? {
          new: true as const,
          config: getDefaultConfig(),
          workspaceId,
        }
      : {
          new: false as const,
          ...data.tool,
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
      refetchTools();
      handleClose();
    },
  };

  const { mutate: createTool } =
    api.workspace.tools.create.useMutation(mutationArgs);

  const { mutate: updateTool } =
    api.workspace.tools.update.useMutation(mutationArgs);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = await methods.trigger();

    if (!isValid) {
      return;
    }

    const values = methods.getValues();

    values.new ? createTool(values) : updateTool(values);
  };

  const fields = useToolFields(methods);

  return (
    <SideOver
      title={data.new ? "Create Tool" : "Edit Tool"}
      description={TOOLS_HELP_TEXT}
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

const useToolFields = (
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>
) => {
  const fields: BasicFormItemProps[] = [
    {
      required: true,
      label: {
        title: "Tool type",
      },
      field: {
        variant: "select",
        options: Object.entries(TOOL_DEFINITIONS).map(([key, definition]) => ({
          value: key,
          label: definition.name,
        })),
        onChange: async (value) => {
          methods.setValue("config", getDefaultConfig(value as ToolVariant));

          // Force re-render
          await methods.trigger("config");
          methods.clearErrors("config");
        },
        active: methods.getValues("config.type"),
      },
    },
    {
      required: true,
      label: {
        title: "Tool name",
        description:
          'Custom name for the tool, e.g. "Blog helpdesk". This is used to help the AI',
      },
      field: {
        variant: "text",
        register: methods.register("name"),
        error: methods.formState.errors.name,
      },
    },
    {
      label: {
        title: "Description",
        description:
          "Brief description of the tool. This is used by the AI to refine its answers.",
      },
      field: {
        variant: "textarea",
        register: methods.register("description"),
        error: methods.formState.errors.description,
      },
    },
  ];

  const toolConfig = TOOL_DEFINITIONS[methods.getValues("config.type")];

  toolConfig.fields.forEach((field) => {
    // @ts-expect-error - We know that the field is defined
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const error = methods.formState.errors.config?.[field.accessor];

    fields.push({
      required: field.required,
      label: {
        title: field.name,
        description: field.description,
      },
      field: {
        variant: "text",
        register: methods.register(`config.${field.accessor}`),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: error as FieldError | undefined,
      },
    });
  });

  return fields;
};
