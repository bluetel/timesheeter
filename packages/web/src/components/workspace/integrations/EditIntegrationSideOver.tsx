import { useZodForm } from '@timesheeter/web/utils/zod-form';
import {
  createIntegrationSchema,
  updateIntegrationSchema,
  INTEGRATION_DEFINITIONS,
  getDefaultIntegrationConfig,
  type IntegrationType,
} from '@timesheeter/web/lib/workspace/integrations';
import { api, type RouterOutputs } from '@timesheeter/web/utils/api';
import { useEffect, useState } from 'react';
import { INTEGRATIONS_HELP_TEXT } from '@timesheeter/web/lib/workspace/integrations';
import { z } from 'zod';
import { SideOver, type SideOverProps } from '@timesheeter/web/components/ui/SideOver';
import { BasicForm } from '@timesheeter/web/components/ui/forms/BasicForm/BasicForm';
import { type BasicFormItemProps } from '@timesheeter/web/components/ui/forms/BasicForm/BasicFormItem';
import { useNotifications } from '../../ui/notification/NotificationProvider';
import { fromZodError } from 'zod-validation-error';
import { ConfigIcon } from '@timesheeter/web/lib/icons';
import { SiGooglesheets } from 'react-icons/si';
import { SelectAndTextForm } from '../../ui/SelectAndTextForm';
import { type WorkspaceInfo } from '@timesheeter/web/server';
import {
  type Timesheet,
  timesheetSchema,
  timesheetDescription,
} from '@timesheeter/web/lib/workspace/integrations/google-sheets';
import { TaskIcon, customJSONStringify, taskPrefixRegex } from '@timesheeter/web/lib';
import {
  type EmailMapEntry,
  emailMapDescription,
  emailMapEntrySchema,
  TogglEmailMapIcon,
} from '@timesheeter/web/lib/workspace/integrations/toggl';
import { ListableForm } from '../../ui/forms/BasicForm/ListableForm';
import { jiraTaskPrefixesDescription } from '@timesheeter/web/lib/workspace/integrations/jira';

const mutationSchema = z.union([
  createIntegrationSchema.extend({
    new: z.literal(true),
  }),
  updateIntegrationSchema.extend({
    new: z.literal(false),
  }),
]);

type EditIntegrationSideOverProps = {
  refetchIntegrations: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
    | {
        new: true;
      }
    | {
        new: false;
        integration: RouterOutputs['workspace']['integrations']['list'][0];
      };
  workspaceId: string;
  userId: string;
  memberships: WorkspaceInfo['memberships'];
};

export const EditIntegrationSideOver = ({
  refetchIntegrations,
  show,
  onClose,
  data,
  workspaceId,
  userId,
  memberships,
}: EditIntegrationSideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () =>
    data.new
      ? {
          new: true as const,
          workspaceId,
          name: 'New integration',
          config: getDefaultIntegrationConfig(),
          privateUserId: null,
        }
      : {
          new: false as const,
          ...data.integration,
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
      refetchIntegrations();
      handleClose();
    },
  };

  const { mutate: createIntegration } = api.workspace.integrations.create.useMutation(mutationArgs);

  const { mutate: updateIntegration } = api.workspace.integrations.update.useMutation(mutationArgs);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let values = methods.getValues();

    // If just updating, filter out the values that are not changed
    if (!data.new) {
      const { integration } = data;

      values = {
        ...values,
        config: {
          ...(Object.fromEntries(
            Object.entries(values.config ?? {}).filter(
              ([key, value]) => (integration.config as Record<string, unknown>)[key] !== value
            )
          ) as (typeof values)['config']),
          type: values.config.type ?? integration.config.type,
        },
      } as typeof values;

      // Filter out undefined values
      values = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as typeof values;
    }

    // Validate form
    const result = mutationSchema.safeParse(values);

    if (!result.success) {
      addNotification({
        variant: 'error',
        primaryText: `Failed to ${data.new ? 'create' : 'update'} integration`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new
      ? createIntegration(values, {
          onError: (error) => {
            addNotification({
              variant: 'error',
              primaryText: 'Failed to create integration',
              secondaryText: error.message,
            });
          },
        })
      : updateIntegration(values, {
          onError: (error) => {
            addNotification({
              variant: 'error',
              primaryText: 'Failed to update integration',
              secondaryText: error.message,
            });
          },
        });
  };

  const fields = useIntegrationFields({ methods, userId });

  const getTaskPrefixes = () => {
    const taskPrefixes = [...(methods.getValues('config.taskPrefixes') ?? [])];

    if (taskPrefixes.length === 0) {
      taskPrefixes.push('');
    }

    return taskPrefixes;
  };

  const getTabs = (): SideOverProps['tabs'] => {
    const config = methods.getValues('config');
    const integrationType = config.type;

    const integrationDefinition = INTEGRATION_DEFINITIONS[integrationType];

    if (integrationType === 'GoogleSheetsIntegration') {
      const timesheets = [...(config.timesheets ?? ([] as { userId: string | null; sheetId: string }[]))];

      if (timesheets.length === 0) {
        timesheets.push({
          userId: null,
          sheetId: '',
        });
      }

      const values = timesheets.map((timesheet) => ({
        selectValue: timesheet.userId,
        text: timesheet.sheetId,
      }));

      const selectOptions = memberships.map((membership) => ({
        value: membership.user.id,
        label: membership.user.name ?? membership.user.email ?? `Unknown user ${membership.user.id}`,
      }));

      return {
        multiple: true as const,
        bodies: [
          {
            icon: ConfigIcon,
            label: 'Configuration',
            body: <BasicForm items={fields} />,
            subDescription: integrationDefinition.description,
          },
          {
            icon: SiGooglesheets,
            label: 'Timesheets',
            body: (
              <SelectAndTextForm
                minRows={1}
                placeholder="Sheet ID"
                values={values}
                selectOptions={selectOptions}
                onChange={(newValues) => {
                  const filteredValues = newValues
                    .map(({ selectValue, text }) => ({
                      userId: selectValue,
                      sheetId: text,
                    }))
                    .map((value) => {
                      const result = timesheetSchema.safeParse(value);
                      if (!result.success) return null;

                      return result.data;
                    })
                    .filter((value): value is Timesheet => value !== null);

                  methods.setValue('config.timesheets', filteredValues, {
                    shouldValidate: true,
                  });
                }}
                nullable
              />
            ),
            subDescription: timesheetDescription,
          },
        ],
      };
    }

    if (integrationType === 'TogglIntegration') {
      const emailMap = [...(config.emailMap ?? ([] as { userId: string | null; togglEmail: string }[]))];

      if (emailMap.length === 0) {
        emailMap.push({
          userId: null,
          togglEmail: '',
        });
      }

      const values = emailMap.map((emailMapEntry) => ({
        selectValue: emailMapEntry.userId,
        text: emailMapEntry.togglEmail,
      }));

      const selectOptions = memberships.map((membership) => ({
        value: membership.user.id,
        label: membership.user.name ?? membership.user.email ?? `Unknown user ${membership.user.id}`,
      }));

      return {
        multiple: true as const,
        bodies: [
          {
            icon: ConfigIcon,
            label: 'Configuration',
            body: <BasicForm items={fields} />,
            subDescription: integrationDefinition.description,
          },
          {
            icon: TogglEmailMapIcon,
            label: 'Toggl Email Map',
            body: (
              <SelectAndTextForm
                minRows={1}
                placeholder="Toggl user email"
                values={values}
                selectOptions={selectOptions}
                onChange={(newValues) => {
                  const filteredValues = newValues
                    .map(({ selectValue, text }) => ({
                      userId: selectValue,
                      togglEmail: text,
                    }))
                    .map((value) => {
                      const result = emailMapEntrySchema.safeParse(value);
                      if (!result.success) return null;

                      return result.data;
                    })
                    .filter((value): value is EmailMapEntry => value !== null);

                  methods.setValue('config.emailMap', filteredValues, {
                    shouldValidate: true,
                  });
                }}
                nullable
              />
            ),
            subDescription: emailMapDescription,
          },
        ],
      };
    }

    if (integrationType === 'JiraIntegration') {
      return {
        multiple: true as const,
        bodies: [
          {
            icon: ConfigIcon,
            label: 'Configuration',
            body: <BasicForm items={fields} />,
            subDescription: integrationDefinition.description,
          },
          {
            icon: TaskIcon,
            label: 'Task Prefixes',
            body: (
              <ListableForm
                minRows={0}
                placeholder="E.g. TS"
                values={getTaskPrefixes()}
                onChange={(newValues) => {
                  // Filter out task prefixes that are invalid i.e. blank ones
                  const filteredValues = newValues.filter((value) => taskPrefixRegex.test(value));

                  methods.setValue('config.taskPrefixes', filteredValues, {
                    shouldValidate: true,
                  });
                }}
              />
            ),
            subDescription: jiraTaskPrefixesDescription,
          },
        ],
      };
    }

    return {
      multiple: false,
      subDescription: integrationDefinition.description,
      body: <BasicForm items={fields} />,
    };
  };

  return (
    <SideOver
      title={data.new ? 'Create Integration' : 'Edit Integration'}
      description={INTEGRATIONS_HELP_TEXT}
      show={show}
      onClose={handleClose}
      actionButtonLabel={data.new ? 'Create' : 'Update'}
      onFormSubmit={handleSubmit}
      tabs={getTabs()}
    />
  );
};

const useIntegrationFields = ({
  methods,
  userId,
}: {
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>;
  userId: string;
}) => {
  const fields: BasicFormItemProps[] = [
    {
      required: true,
      label: {
        title: 'Integration type',
      },
      field: {
        variant: 'select',
        select: {
          options: Object.entries(INTEGRATION_DEFINITIONS).map(([key, definition]) => ({
            value: key,
            label: definition.name,
          })),
          onChange: (value) =>
            methods.setValue('config', getDefaultIntegrationConfig(value as IntegrationType), {
              shouldValidate: true,
            }),
          active: methods.getValues('config.type'),
        },
      },
    },
    {
      required: true,
      label: {
        title: 'Integration name',
        description: `Descriptive name for the integration, e.g. "ACME's Toggl"`,
      },
      field: {
        variant: 'text',
        register: methods.register('name'),
        error: methods.formState.errors.name,
      },
    },
    {
      required: true,
      label: {
        title: 'Private Integration',
        description: 'Whether this integration is private to you or can be used by other members of the workspace',
      },
      field: {
        variant: 'checkbox',
        checked: !!methods.getValues('privateUserId'),
        onChange: (isPrivate) =>
          isPrivate
            ? methods.setValue('privateUserId', userId, {
                shouldValidate: true,
              })
            : methods.setValue('privateUserId', null, {
                shouldValidate: true,
              }),
        error: methods.formState.errors.privateUserId,
      },
    },
  ];

  const integrationConfig = INTEGRATION_DEFINITIONS[methods.getValues('config.type')];

  integrationConfig.fields.forEach((field) => {
    // TODO: Handle field errors
    // const error = methods.formState.errors.config?.[field.accessor as keyof typeof methods.formState.errors.config];

    if (field.type === 'hidden') return;

    fields.push({
      required: field.required,
      label: {
        title: field.name,
        description: field.description,
      },
      field: {
        variant: 'text',
        register: methods.register(`config.${field.accessor}`),
        //error: typeof error === "string" ? new FieldError(error) : error,
      },
    });
  });

  return fields;
};
