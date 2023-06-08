import {
  CONNECTOR_DEFINITIONS,
  type ConnectorDetail,
} from "@timesheeter/app/lib/workspace/connectors";
import type { ParsedConnector } from "@timesheeter/app/server/api/routers/workspace/connectors";
import { EditConnectorSideOver } from "./EditConnectorSideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";
import { DeleteConnectorModal } from "./DeleteConnectorModal";
import { CONNECTORS_HELP_TEXT } from "@timesheeter/app/lib/workspace/connectors";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";

type ConnectorDetailProps = {
  connector: ParsedConnector;
  refetchConnectors: () => unknown;
  onNewConnectorClick: () => void;
};

export const ConnectorPanel = ({
  connector,
  refetchConnectors,
  onNewConnectorClick,
}: ConnectorDetailProps) => {
  const [showEditConnectorSideOver, setShowEditConnectorSideOver] =
    useState(false);
  const [showDeleteConnectorModal, setShowDeleteConnectorModal] =
    useState(false);

  const connectorDetail =
    CONNECTOR_DEFINITIONS[connector.config.type];

  const basicDetails = useBasicDetails(connector, connectorDetail);

  return (
    <>
      <DeleteConnectorModal
        connector={connector}
        onClose={() => setShowDeleteConnectorModal(false)}
        show={showDeleteConnectorModal}
        refetchConnectors={refetchConnectors}
      />
      <EditConnectorSideOver
        show={showEditConnectorSideOver}
        onClose={() => setShowEditConnectorSideOver(false)}
        refetchConnectors={refetchConnectors}
        data={{
          new: false,
          connector,
        }}
        workspaceId={connector.workspaceId}
      />
      <DetailPanel
        header={{
          title: "Connectors",
          description: CONNECTORS_HELP_TEXT,
          newButton: {
            label: "New connector",
            onClick: onNewConnectorClick,
          },
        }}
        content={{
          name: CONNECTOR_DEFINITIONS[connector.config.type].name,
          description: CONNECTOR_DEFINITIONS[connector.config.type].description,
          icon: connectorDetail.icon,
          endButtons: {
            onEdit: () => setShowEditConnectorSideOver(true),
            onDelete: () => setShowDeleteConnectorModal(true),
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
  model: RouterOutputs["workspace"]["connectors"]["list"][0],
  connectorDetail: ConnectorDetail
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this connectors",
      },
      field: {
        variant: "text",
        value: model.id,
      },
    },
    {
      label: {
        title: "Name",
        description: `Descriptive name for the connector, e.g. "James's Toggl"`
      },
      field: {
        variant: "text",
        value: model.name,
      },
    },
  ];

  if (model.description) {
    details.push({
      label: {
        title: "Description",
        description:
          "An extra description for the connector, e.g. what is it used for"
      },
      field: {
        variant: "text",
        value: model.description,
      },
    });
  }

  connectorDetail.fields.forEach((field) => {
    const value =
      ((model.config as Record<string, unknown>)[field.accessor] as string) ?? "";

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
