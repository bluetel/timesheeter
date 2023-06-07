import { useEffect } from "react";
import { type FieldError } from "react-hook-form";
import { z } from "zod";
import { SideOver } from "@timesheeter/app/components/ui/SideOver";
import { BasicForm } from "@timesheeter/app/components/ui/forms/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/app/components/ui/forms/BasicForm/BasicFormItem";
import {
  CONNECTORS_HELP_TEXT,
  CONNECTOR_DEFINITIONS,
  type ConnectorVariant,
  getDefaultConfig,
} from "@timesheeter/app/lib/workspace/connectors";
import {
  createConnectorSchema,
  updateConnectorSchema,
} from "@timesheeter/app/lib/workspace/connectors";
import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { useZodForm } from "@timesheeter/app/utils/zod-form";

const mutationSchema = z.union([
  createConnectorSchema.extend({
    new: z.literal(true),
  }),
  updateConnectorSchema.extend({
    new: z.literal(false),
  }),
]);

type EditConnectorSideOverProps = {
  refetchModels: () => void;
  show: boolean;
  onClose: () => void;
  modelId: string;
  workspaceId: string;
  data:
    | {
        new: true;
      }
    | {
        new: false;
        connector: RouterOutputs["workspace"]["models"]["list"][0]["connectors"][0];
      };
};

export const EditConnectorSideOver = ({
  refetchModels,
  show,
  onClose,
  data,
  modelId,
  workspaceId,
}: EditConnectorSideOverProps) => {
  const getDefaultValues = () =>
    data.new
      ? {
          new: true as const,
          workspaceId,
          modelId,
          config: getDefaultConfig(),
        }
      : {
          new: false as const,
          ...data.connector,
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

  const { mutate: createConnector } =
    api.workspace.connectors.create.useMutation(mutationArgs);

  const { mutate: updateConnector } =
    api.workspace.connectors.update.useMutation(mutationArgs);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = await methods.trigger();

    if (!isValid) {
      return;
    }

    const values = methods.getValues();

    values.new ? createConnector(values) : updateConnector(values);
  };

  const fields = useConnectorFields(methods);

  return (
    <SideOver
      title={data.new ? "Create Connector" : "Edit Connector"}
      description={CONNECTORS_HELP_TEXT}
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

const useConnectorFields = (
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>
) => {
  const fields: BasicFormItemProps[] = [
    {
      required: true,
      label: {
        title: "Connector type",
      },
      field: {
        variant: "select",
        options: Object.entries(CONNECTOR_DEFINITIONS).map(
          ([key, definition]) => ({
            value: key,
            label: definition.name,
          })
        ),
        onChange: async (value) => {
          methods.setValue(
            "config",
            getDefaultConfig(value as ConnectorVariant)
          );

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
        title: "Connector Name",
        description: "The name of the connector, for your reference.",
      },
      field: {
        variant: "text",
        register: methods.register("name"),
        error: methods.formState.errors.name,
      },
    },
  ];

  const connectorConfig =
    CONNECTOR_DEFINITIONS[methods.getValues("config.type")];

  connectorConfig.fields.forEach((field) => {
    // @ts-expect-error - We know that the field is defined
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const error = methods.formState.errors.config?.[field.accessor];

    fields.push({
      required: field.required,
      label: {
        title: field.name,
        description: field.description,
      },
      field:
        field.type === "boolean"
          ? {
              variant: "checkbox",
              checked: methods.getValues(`config.${field.accessor}`),
              onChange: async (value: boolean) => {
                methods.setValue(`config.${field.accessor}`, value);

                // Force re-render
                await methods.trigger(`config.${field.accessor}`);
                methods.clearErrors(`config.${field.accessor}`);
              },
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              error: error as FieldError | undefined,
            }
          : {
              variant: "text",
              register: methods.register(`config.${field.accessor}`),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              error: error as FieldError | undefined,
            },
    });
  });

  return fields;
};
