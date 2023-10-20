import { INTEGRATION_DEFINITIONS, type IntegrationDetail } from '@timesheeter/web/lib/workspace/integrations';
import type { ParsedIntegration } from '@timesheeter/web/server/api/routers/workspace/integrations';
import { EditIntegrationSideOver } from './EditIntegrationSideOver';
import { useMemo, useState } from 'react';
import { DetailPanel, type DetailPanelProps } from '@timesheeter/web/components/ui/DetailPanel/DetailPanel';
import { DeleteIntegrationModal } from './DeleteIntegrationModal';
import { INTEGRATIONS_HELP_TEXT } from '@timesheeter/web/lib/workspace/integrations';
import { type RouterOutputs } from '@timesheeter/web/utils/api';
import { BasicDetailList, type BasicDetailListItem } from '@timesheeter/web/components/ui/DetailPanel/BasicDetailList';
import { type WorkspaceInfo } from '@timesheeter/web/server';
import { ConfigIcon } from '@timesheeter/web/lib/icons';
import { SiGooglesheets } from 'react-icons/si';
import { timesheetDescription } from '@timesheeter/web/lib/workspace/integrations/google-sheets';
import { SelectableList } from '../../ui/SelectableList';
import { SimpleEmptyState } from '../../ui/SimpleEmptyState';
import { TogglEmailMapIcon, emailMapDescription } from '@timesheeter/web/lib/workspace/integrations/toggl';
import { jiraTaskPrefixesDescription } from '@timesheeter/web/lib/workspace/integrations/jira';
import { ProjectIcon } from '@timesheeter/web/lib';
import { type IconType } from 'react-icons/lib';

type IntegrationPanelProps = {
  integration: ParsedIntegration;
  refetchIntegrations: () => unknown;
  onNewIntegrationClick: () => void;
  memberships: WorkspaceInfo['memberships'];
  userId: string;
  workspaceTaskPrefixes: RouterOutputs['workspace']['taskPrefixes']['listMinimal'];
};

export const IntegrationPanel = ({
  integration,
  refetchIntegrations,
  onNewIntegrationClick,
  memberships,
  userId,
  workspaceTaskPrefixes,
}: IntegrationPanelProps) => {
  const [showEditIntegrationSideOver, setShowEditIntegrationSideOver] = useState(false);
  const [showDeleteIntegrationModal, setShowDeleteIntegrationModal] = useState(false);

  const integrationDetail = INTEGRATION_DEFINITIONS[integration.config.type];

  const basicDetails = useBasicDetails(integration, integrationDetail);

  const detailTabs = useMemo<DetailPanelProps['tabs']>(() => {
    const integrationType = integration.config.type;

    if (integrationType === 'GoogleSheetsIntegration') {
      return {
        multiple: true,
        bodies: [
          {
            icon: ConfigIcon,
            label: 'Config',
            body: <BasicDetailList items={basicDetails} />,
          },
          {
            icon: SiGooglesheets,
            label: 'Timesheets',
            subDescription: timesheetDescription,
            body:
              integration.config.timesheets.length > 0 ? (
                <SelectableList
                  items={integration.config.timesheets.map(({ sheetId, userId }) => {
                    const membership = memberships.find((m) => m.user.id === userId);

                    return {
                      icon: SiGooglesheets,
                      label: membership?.user.name ?? membership?.user.email ?? `Unknown user ${userId}`,
                      subLabel: `Sheet ID - ${sheetId}`,
                      actionButtons: [
                        {
                          label: 'Open',
                          onClick: () => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank'),
                        },
                      ],
                    };
                  })}
                />
              ) : (
                <SimpleEmptyState
                  title="No tracked timesheets"
                  helpText="Add some timesheets to this integration to start outputting to Google Sheets"
                  icon={SiGooglesheets}
                  button={{
                    label: 'Add timesheet',
                    onClick: () => setShowEditIntegrationSideOver(true),
                  }}
                  shrink
                />
              ),
          },
        ],
      };
    }

    if (integrationType === 'TogglIntegration') {
      return {
        multiple: true,
        bodies: [
          {
            icon: ConfigIcon,
            label: 'Config',
            body: <BasicDetailList items={basicDetails} />,
          },
          {
            icon: TogglEmailMapIcon,
            label: 'Toggl Email Map',
            subDescription: emailMapDescription,
            body:
              integration.config.emailMap.length > 0 ? (
                <SelectableList
                  items={integration.config.emailMap.map(({ togglEmail, userId }) => {
                    const membership = memberships.find((m) => m.user.id === userId);

                    return {
                      icon: TogglEmailMapIcon,
                      label: membership?.user.name ?? membership?.user.email ?? `Unknown user ${userId}`,
                      subLabel: togglEmail,
                    };
                  })}
                />
              ) : (
                <SimpleEmptyState
                  title="No mapped emails"
                  helpText="Add some mapped emails to associate Toggl users with Timesheeter users"
                  icon={TogglEmailMapIcon}
                  button={{
                    label: 'Add mapped email',
                    onClick: () => setShowEditIntegrationSideOver(true),
                  }}
                  shrink
                />
              ),
          },
        ],
      };
    }

    if (integrationType === 'JiraIntegrationV2') {
      const prefixItems = workspaceTaskPrefixes
        .map((prefix) => {
          if (integration.config.type !== 'JiraIntegrationV2') {
            throw new Error('Invalid integration type');
          }

          const taskPrefixId = integration.config.taskPrefixIds.find((id) => id === prefix.id);
          if (!taskPrefixId) {
            return null;
          }

          return {
            label: prefix.prefix,
            subLabel: prefix.project.name,
            icon: ProjectIcon,
          };
        })
        .filter(Boolean) as { label: string; subLabel: string; icon: IconType }[];

      return {
        multiple: true,
        bodies: [
          {
            icon: ConfigIcon,
            label: 'Config',
            body: <BasicDetailList items={basicDetails} />,
          },
          {
            icon: ConfigIcon,
            label: 'Task Prefixes',
            subDescription: jiraTaskPrefixesDescription,
            body:
              integration.config.taskPrefixIds.length > 0 ? (
                <SelectableList items={prefixItems} />
              ) : (
                <SimpleEmptyState
                  title="No task prefixes"
                  helpText="Add some task prefixes to this integration to start outputting from Jira"
                  icon={ProjectIcon}
                  button={{
                    label: 'Add task prefix',
                    onClick: () => setShowEditIntegrationSideOver(true),
                  }}
                  shrink
                />
              ),
          },
        ],
      };
    }

    return {
      multiple: false,
      body: <BasicDetailList items={basicDetails} />,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.config, basicDetails, memberships]);

  return (
    <>
      <DeleteIntegrationModal
        integration={integration}
        onClose={() => setShowDeleteIntegrationModal(false)}
        show={showDeleteIntegrationModal}
        refetchIntegrations={refetchIntegrations}
      />
      <EditIntegrationSideOver
        show={showEditIntegrationSideOver}
        onClose={() => setShowEditIntegrationSideOver(false)}
        refetchIntegrations={refetchIntegrations}
        data={{
          new: false,
          integration,
        }}
        workspaceId={integration.workspaceId}
        memberships={memberships}
        userId={userId}
        workspaceTaskPrefixes={workspaceTaskPrefixes}
      />
      <DetailPanel
        header={{
          title: 'Integrations',
          description: INTEGRATIONS_HELP_TEXT,
          newButton: {
            label: 'New integration',
            onClick: onNewIntegrationClick,
          },
        }}
        content={{
          name: integration.name,
          description: `${INTEGRATION_DEFINITIONS[integration.config.type].name} • ${
            INTEGRATION_DEFINITIONS[integration.config.type].description
          }`,
          icon: integrationDetail.icon,
          endButtons: {
            onEdit: () => setShowEditIntegrationSideOver(true),
            onDelete: () => setShowDeleteIntegrationModal(true),
          },
        }}
        tabs={detailTabs}
      />
    </>
  );
};

const useBasicDetails = (
  integration: RouterOutputs['workspace']['integrations']['list'][0],
  integrationDetail: IntegrationDetail
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: 'ID',
        description: 'The unique identifier for this integration',
      },
      field: {
        variant: 'text',
        value: integration.id,
      },
    },
    {
      label: {
        title: 'Name',
        description: `Descriptive name for the integration, e.g. "ACME's Toggl"`,
      },
      field: {
        variant: 'text',
        value: integration.name,
      },
    },
    {
      label: {
        title: 'Private Integration',
        description: 'Whether this integration is private to you or can be used by other members of the workspace',
      },
      field: {
        variant: 'text',
        value: integration.privateUserId ? 'Yes' : 'No',
      },
    },
  ];

  integrationDetail.fields.forEach((field) => {
    const value = ((integration.config as Record<string, unknown>)[field.accessor] as string) ?? '';

    if (field.type === 'hidden') {
      return;
    }

    details.push({
      label: {
        title: field.name,
        description: field.description,
      },
      field: {
        variant: 'text',
        value,
      },
    });
  });

  if (integration.config.type === 'JiraIntegration') {
    details.push({
      label: {
        title: 'Task Prefixes',
        description: jiraTaskPrefixesDescription,
      },
      field: {
        variant: 'text',
        value: integration.config.taskPrefixes.join(', '),
      },
    });
  }

  return details;
};
