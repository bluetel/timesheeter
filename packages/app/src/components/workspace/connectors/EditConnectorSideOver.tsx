import { useZodForm } from "@timesheeter/app/utils/zod-form";
import {
  createConnectorSchema,
  updateConnectorSchema,
  CONNECTOR_DEFINITIONS,
  getDefaultConfig,
  type ConnectorVariant,
} from "@timesheeter/app/lib/workspace/connectors";
import { api, type RouterOutputs } from "@timesheeter/app/utils/api";
import React, { useEffect } from "react";
import { CONNECTORS_HELP_TEXT } from "@timesheeter/app/lib/workspace/connectors";
import { z } from "zod";
import { SideOver } from "@timesheeter/app/components/ui/SideOver";
import { BasicForm } from "@timesheeter/app/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/app/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from 'zod-validation-error';

const mutationSchema = z.union([
  createConnectorSchema.extend({
    new: z.literal(true),
  }),
  updateConnectorSchema.extend({
    new: z.literal(false),
  }),
]);

type EditConnectorSideOverProps = {
  refetchConnectors: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
  | {
    new: true;
  }
  | {
    new: false;
    connector: RouterOutputs["workspace"]["connectors"]["list"][0];
  };
  workspaceId: string;
};

export const EditConnectorSideOver = ({
  refetchConnectors,
  show,
  onClose,
  data,
  workspaceId,
}: EditConnectorSideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
        new: true as const,
        workspaceId,
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
      refetchConnectors();
      handleClose();
    },
  };

  const { mutate: createConnector } =
    api.workspace.connectors.create.useMutation(mutationArgs);

  const { mutate: updateConnector } =
    api.workspace.connectors.update.useMutation(mutationArgs);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let values = methods.getValues();

    // If just updating, filter out the values that are not changed
    if (!data.new) {
      const { connector } = data;

      values = {
        ...values,
        config: {
          ...Object.fromEntries(
            Object.entries(values.config ?? {}).filter(
              ([key, value]) => (connector.config as Record<string, unknown>)[key] !== value
            )) as typeof values["config"],
          type: values.config.type ?? connector.config.type,
        },
        description:
          connector.description !== values.description ? values.description : undefined,
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
        primaryText: `Failed to ${data.new ? "create" : "update"} connector`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new ? createConnector(values, {
      onError: (error) => {
        addNotification({
          variant: "error",
          primaryText: "Failed to create connector",
          secondaryText: error.message,
        });
      }
    }) : updateConnector(values, {
      onError: (error) => {
        addNotification({
          variant: "error",
          primaryText: "Failed to update connector",
          secondaryText: error.message,
        });
      },
    });
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
        title: "Connector name",
        description:
          `Descriptive name for the connector, e.g. "James's Toggl"`
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
          "An extra description for the connector, e.g. what is it used for",
      },
      field: {
        variant: "textarea",
        register: methods.register("description"),
        error: methods.formState.errors.description,
      },
    },
  ];

  const ConnectorConfig =
    CONNECTOR_DEFINITIONS[methods.getValues("config.type")];

  ConnectorConfig.fields.forEach((field) => {
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
        error
      },
    });
  });

  return fields;
};
