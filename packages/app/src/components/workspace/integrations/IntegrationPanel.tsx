import {
  INTEGRATION_DEFINITIONS,
  type IntegrationDetail,
} from "@timesheeter/app/lib/workspace/integrations";
import type { ParsedIntegration } from "@timesheeter/app/server/api/routers/workspace/integrations";
import { EditIntegrationSideOver } from "./EditIntegrationSideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";
import { DeleteIntegrationModal } from "./DeleteIntegrationModal";
import { INTEGRATIONS_HELP_TEXT } from "@timesheeter/app/lib/workspace/integrations";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";

type IntegrationDetailProps = {
  integration: ParsedIntegration;
  refetchIntegrations: () => unknown;
  onNewIntegrationClick: () => void;
};

export const IntegrationPanel = ({
  integration,
  refetchIntegrations,
  onNewIntegrationClick,
}: IntegrationDetailProps) => {
  const [showEditIntegrationSideOver, setShowEditIntegrationSideOver] =
    useState(false);
  const [showDeleteIntegrationModal, setShowDeleteIntegrationModal] =
    useState(false);

  const integrationDetail =
    INTEGRATION_DEFINITIONS[integration.config.type];

  const basicDetails = useBasicDetails(integration, integrationDetail);

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
          name: INTEGRATION_DEFINITIONS[integration.config.type].name,
          description: INTEGRATION_DEFINITIONS[integration.config.type].description,
          icon: integrationDetail.icon,
          endButtons: {
            onEdit: () => setShowEditIntegrationSideOver(true),
            onDelete: () => setShowDeleteIntegrationModal(true),
          },
        }}
        tabs={{
          multiple: false,
          body: <BasicDetailList items={basicDetails} />,
        }}
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
        description: "The unique identifier for this integrations",
      },
      field: {
        variant: "text",
        value: integration.id,
      },
    },
    {
      label: {
        title: "Name",
        description: `Descriptive name for the integration, e.g. "James's Toggl"`
      },
      field: {
        variant: "text",
        value: integration.name,
      },
    },
  ];

  integrationDetail.fields.forEach((field) => {
    const value =
      ((integration.config as Record<string, unknown>)[field.accessor] as string) ??
      "";

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
