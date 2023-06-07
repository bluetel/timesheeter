import { useZodForm } from "@timesheeter/app/utils/zod-form";
import { createModelSchema, updateModelSchema } from "@timesheeter/app/lib/workspace/models";
import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { MODELS_HELP_TEXT } from "@timesheeter/app/lib/workspace/models";
import { z } from "zod";
import { SideOver } from "@timesheeter/app/components/ui/SideOver";
import { IntegrationIcon, ToolIcon } from "@timesheeter/app/styles/icons";
import { BasicForm } from "@timesheeter/app/components/ui/forms/BasicForm/BasicForm";
import {
  ClickableListForm,
  type ClickableListFormItem,
} from "@timesheeter/app/components/ui/forms/ClickableListForm";
import {
  INTEGRATION_DEFINITIONS,
  type IntegrationVariant,
} from "@timesheeter/app/lib/workspace/integrations";
import { TOOL_DEFINITIONS, type ToolVariant } from "@timesheeter/app/lib/workspace/tools";
import { useEffect, useRef, useState } from "react";

const mutationSchema = z.union([
  createModelSchema.extend({
    new: z.literal(true),
  }),
  updateModelSchema.extend({
    new: z.literal(false),
  }),
]);

type EditModelSideOverProps = {
  refetchModels: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
    | {
        new: true;
      }
    | {
        new: false;
        model: RouterOutputs["workspace"]["models"]["list"][0];
      };
  workspaceId: string;
};

export const EditModelSideOver = ({
  refetchModels,
  show,
  onClose,
  data,
  workspaceId,
}: EditModelSideOverProps) => {
  const getDefaultValues = () =>
    data.new
      ? {
          new: true as const,
          workspaceId,
        }
      : {
          new: false as const,
          ...data.model,
          integrations: data.model.integrations.map(({ id }) => ({ id })),
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
      refetchModels();
      handleClose();
    },
  };

  const { mutate: createModel } =
    api.workspace.models.create.useMutation(mutationArgs);

  const { mutate: updateModel } =
    api.workspace.models.update.useMutation(mutationArgs);

  const integrationFormItems = useIntegrationFormItems(
    workspaceId,
    data.new ? undefined : data.model
  );

  const toolFormItems = useToolFormItems(
    workspaceId,
    data.new ? undefined : data.model
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Apply form items to form values
    methods.setValue(
      "integrations",
      integrationFormItems
        .filter(({ selected }) => selected)
        .map(({ id }) => ({ id }))
    );

    methods.setValue(
      "tools",
      toolFormItems.filter(({ selected }) => selected).map(({ id }) => ({ id }))
    );

    const isValid = await methods.trigger();

    if (!isValid) {
      return;
    }

    const values = methods.getValues();

    values.new ? createModel(values) : updateModel(values);
  };

  return (
    <SideOver
      title={data.new ? "Create Model" : "Edit Model"}
      description={MODELS_HELP_TEXT}
      show={show}
      onClose={handleClose}
      actionButtonLabel={data.new ? "Create" : "Update"}
      onFormSubmit={handleSubmit}
      tabs={{
        multiple: true,
        bodies: [
          {
            label: "Details",
            body: (
              <BasicForm
                items={[
                  {
                    required: true,
                    label: {
                      title: "Model name",
                      description:
                        'Custom name for your model, e.g. "Blog helpdesk".',
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
                        "Brief description of the model. This will be shown in the model list.",
                    },
                    field: {
                      variant: "textarea",
                      register: methods.register("description"),
                      error: methods.formState.errors.description,
                    },
                  },
                ]}
              />
            ),
          },
          {
            label: "Integrations",
            icon: IntegrationIcon,
            body: <ClickableListForm items={integrationFormItems} />,
          },
          {
            label: "Tools",
            icon: ToolIcon,
            body: <ClickableListForm items={toolFormItems} />,
          },
        ],
      }}
    />
  );
};

const useIntegrationFormItems = (
  workspaceId: string,
  model?: RouterOutputs["workspace"]["models"]["list"][0]
) => {
  const [integrationFormItems, setIntegrationFormItems] = useState<
    ClickableListFormItem[]
  >([]);

  const integrationFormItemsRef = useRef(integrationFormItems);
  integrationFormItemsRef.current = integrationFormItems;

  const processIntegrationFormItems = (
    integrations: RouterOutputs["workspace"]["integrations"]["list"]
  ) =>
    setIntegrationFormItems(
      integrations.map((integration, index) => ({
        id: integration.id,
        label: integration.name,
        subLabel: integration.description,
        icon: INTEGRATION_DEFINITIONS[integration.type as IntegrationVariant]
          .icon,
        selected:
          model?.integrations?.some(({ id }) => id === integration.id) ?? false,
        onChange: (selected: boolean) =>
          setIntegrationFormItems(
            integrationFormItemsRef.current.map((formValue, formIndex) => ({
              ...formValue,
              selected: index === formIndex ? selected : formValue.selected,
            }))
          ),
      }))
    );

  api.workspace.integrations.list.useQuery(
    {
      workspaceId,
    },
    {
      onSuccess: (integrations) => processIntegrationFormItems(integrations),
    }
  );

  return integrationFormItems;
};

const useToolFormItems = (
  workspaceId: string,
  model?: RouterOutputs["workspace"]["models"]["list"][0]
) => {
  const [toolFormItems, setToolFormItems] = useState<ClickableListFormItem[]>(
    []
  );

  const toolFormItemsef = useRef(toolFormItems);
  toolFormItemsef.current = toolFormItems;

  const processToolFormItems = (
    tools: RouterOutputs["workspace"]["tools"]["list"]
  ) =>
    setToolFormItems(
      tools.map((tool, index) => ({
        id: tool.id,
        label: tool.name,
        subLabel: tool.description,
        icon: TOOL_DEFINITIONS[tool.type as ToolVariant].icon,
        selected: model?.tools?.some(({ id }) => id === tool.id) ?? false,
        onChange: (selected: boolean) =>
          setToolFormItems(
            toolFormItemsef.current.map((formValue, formIndex) => ({
              ...formValue,
              selected: index === formIndex ? selected : formValue.selected,
            }))
          ),
      }))
    );

  api.workspace.tools.list.useQuery(
    {
      workspaceId,
    },
    {
      onSuccess: (tools) => processToolFormItems(tools),
    }
  );

  return toolFormItems;
};
