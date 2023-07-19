import {
  INTEGRATION_DEFINITIONS,
  type IntegrationDetail,
} from "@timesheeter/web/lib/workspace/integrations";
import type { ParsedIntegration } from "@timesheeter/web/server/api/routers/workspace/integrations";
import { EditIntegrationSideOver } from "./EditIntegrationSideOver";
import { useMemo, useState } from "react";
import { DetailPanel, type DetailPanelProps } from "@timesheeter/web/components/ui/DetailPanel/DetailPanel";
import { DeleteIntegrationModal } from "./DeleteIntegrationModal";
import { INTEGRATIONS_HELP_TEXT } from "@timesheeter/web/lib/workspace/integrations";
import { type RouterOutputs } from "@timesheeter/web/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/web/components/ui/DetailPanel/BasicDetailList";
import { type WorkspaceInfo } from "@timesheeter/web/server";
import { ConfigIcon } from "@timesheeter/web/lib/icons";
import { SiGooglesheets } from "react-icons/si";
import { timesheetDescription } from "@timesheeter/web/lib/workspace/integrations/google-sheets";
import { SelectableList } from "../../ui/SelectableList";
import { SimpleEmptyState } from "../../ui/SimpleEmptyState";

type IntegrationDetailProps = {
  integration: ParsedIntegration;
  refetchIntegrations: () => unknown;
  onNewIntegrationClick: () => void;
  memberships: WorkspaceInfo["memberships"];
};

export const IntegrationPanel = ({
  integration,
  refetchIntegrations,
  onNewIntegrationClick,
  memberships
}: IntegrationDetailProps) => {
  const [showEditIntegrationSideOver, setShowEditIntegrationSideOver] =
    useState(false);
  const [showDeleteIntegrationModal, setShowDeleteIntegrationModal] =
    useState(false);

  const integrationDetail = INTEGRATION_DEFINITIONS[integration.config.type];

  const basicDetails = useBasicDetails(integration, integrationDetail);

  const detailTabs = useMemo<DetailPanelProps["tabs"]>(() => {
    const integrationType = integration.config.type
    console.log("integrationType", integration)

    if (integrationType === "GoogleSheetsIntegration") {
      return {
        multiple: true,
        bodies: [
          {
            icon: ConfigIcon,
            label: "Config",
            body: <BasicDetailList items={basicDetails} />,
          },
          {
            icon: SiGooglesheets,
            label: "Timesheets",
            subDescription: timesheetDescription,
            body: integration.config.timesheets.length > 0 ? (
              <SelectableList
                items={integration.config.timesheets.map(({ sheetId, userId }) => {
                  const membership = memberships.find((m) => m.user.id === userId)

                  const taskName = membership?.user.name ?? membership?.user.email ?? `Unknown user ${userId}`

                  return ({
                    icon: SiGooglesheets,
                    label: taskName,
                    subLabel: sheetId,
                    actionButtons: [
                      {
                        label: "Open",
                        onClick: () => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, "_blank")
                      }
                    ]
                  })
                })}
              />
            ) : (
              <SimpleEmptyState
                title="No tracked timesheets"
                helpText="Add some timesheets to this integration to start outputting to Google Sheets"
                icon={SiGooglesheets}
                button={{
                  label: "Add timesheet",
                  onClick: () => setShowEditIntegrationSideOver(true),
                }}
                shrink
              />
            ),
          }
        ]
      }
    }

    return {
      multiple: false,
      body: <BasicDetailList items={basicDetails} />
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.config, basicDetails, memberships])

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
      />
      <DetailPanel
        header={{
          title: "Integrations",
          description: INTEGRATIONS_HELP_TEXT,
          newButton: {
            label: "New integration",
            onClick: onNewIntegrationClick,
          },
        }}
        content={{
          name: integration.name,
          description: `${INTEGRATION_DEFINITIONS[integration.config.type].name
            } • ${INTEGRATION_DEFINITIONS[integration.config.type].description}`,
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
  integration: RouterOutputs["workspace"]["integrations"]["list"][0],
  integrationDetail: IntegrationDetail
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this integration",
      },
      field: {
        variant: "text",
        value: integration.id,
      },
    },
    {
      label: {
        title: "Name",
        description: `Descriptive name for the integration, e.g. "James's Toggl"`,
      },
      field: {
        variant: "text",
        value: integration.name,
      },
    },
  ];

  integrationDetail.fields.forEach((field) => {
    const value =
      ((integration.config as Record<string, unknown>)[
        field.accessor
      ] as string) ?? "";

    if (field.type === "hidden") {
      return;
    }

    details.push({
      label: {
        title: field.name,
        description: field.description,
      },
      field: {
        variant: "text",
        value,
      },
    });
  });

  return details;
};
