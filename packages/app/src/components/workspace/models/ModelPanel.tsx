import { useEffect, useState } from "react";
import {
  ConnectorIcon,
  IntegrationIcon,
  MemoryIcon,
  ModelIcon,
  ToolIcon,
} from "@timesheeter/app/styles/icons";
import { MODELS_HELP_TEXT } from "@timesheeter/app/lib/workspace/models";
import { EditModelSideOver } from "./EditModelSideOver";
import { DeleteModelModal } from "./DeleteModelModal";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";
import { SimpleEmptyState } from "@timesheeter/app/components/ui/SimpleEmptyState";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import router from "next/router";
import { SelectableList } from "@timesheeter/app/components/ui/SelectableList";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";
import { TOOL_DEFINITIONS, type ToolVariant } from "@timesheeter/app/lib/workspace/tools";
import {
  INTEGRATION_DEFINITIONS,
  type IntegrationVariant,
} from "@timesheeter/app/lib/workspace/integrations";
import { EditConnectorSideOver } from "./EditConnectorSideOver";
import {
  CONNECTOR_DEFINITIONS,
  type ConnectorVariant,
} from "@timesheeter/app/lib/workspace/connectors";
import { DeleteConnectorModal } from "./DeleteConnectorModal";
import { useNotifications } from "@timesheeter/app/components/ui/notification/NotificationProvider";

type ModelDetailProps = {
  model: RouterOutputs["workspace"]["models"]["list"][0];
  refetchModels: () => unknown;
  onNewModelClick: () => void;
};

export const ModelPanel = ({
  model,
  refetchModels,
  onNewModelClick,
}: ModelDetailProps) => {
  const [showEditModelSideOver, setShowEditModelSideOver] = useState(false);
  const [showDeleteModelModal, setShowDeleteModelModal] = useState(false);

  const [showNewConnectorSideOver, setShowNewConnectorSideOver] =
    useState(false);

  const basicDetails = useBasicDetails(model);

  const [selectedConnectorIndex, setSelectedConnectorIndex] = useState<
    number | null
  >(null);

  const [selectedDeleteConnectorIndex, setSelectedDeleteConnectorIndex] =
    useState<number | null>(null);

  useEffect(() => {
    if (model.connectors.length === 0) {
      setSelectedDeleteConnectorIndex(null);
      setSelectedConnectorIndex(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.connectors.length]);

  const { addNotification } = useNotifications();

  return (
    <>
      {model.connectors.map((connector, index) => (
        <div key={connector.id}>
          <EditConnectorSideOver
            show={selectedConnectorIndex === index}
            onClose={() => setSelectedConnectorIndex(null)}
            refetchModels={refetchModels}
            modelId={model.id}
            workspaceId={model.workspaceId}
            data={{
              new: false,
              connector,
            }}
          />
          <DeleteConnectorModal
            show={selectedDeleteConnectorIndex === index}
            onClose={() => setSelectedDeleteConnectorIndex(null)}
            connector={connector}
            refetchModels={refetchModels}
          />
        </div>
      ))}
      <DeleteModelModal
        model={model}
        onClose={() => setShowDeleteModelModal(false)}
        show={showDeleteModelModal}
        refetchModels={refetchModels}
      />
      <EditModelSideOver
        show={showEditModelSideOver}
        onClose={() => setShowEditModelSideOver(false)}
        refetchModels={refetchModels}
        data={{
          new: false,
          model,
        }}
        workspaceId={model.workspaceId}
      />
      <EditConnectorSideOver
        show={showNewConnectorSideOver}
        onClose={() => setShowNewConnectorSideOver(false)}
        refetchModels={refetchModels}
        modelId={model.id}
        workspaceId={model.workspaceId}
        data={{
          new: true,
        }}
      />
      <DetailPanel
        header={{
          title: "Models",
          description: MODELS_HELP_TEXT,
          newButton: {
            label: "New Model",
            onClick: onNewModelClick,
          },
        }}
        content={{
          name: model.name,
          description: model.description,
          icon: ModelIcon,
          endButtons: {
            onEdit: () => setShowEditModelSideOver(true),
            onDelete: () => setShowDeleteModelModal(true),
          },
        }}
        tabs={{
          multiple: true,
          bodies: [
            {
              label: "Details",
              body: <BasicDetailList items={basicDetails} />,
            },
            {
              label: "Integrations",
              icon: IntegrationIcon,
              body:
                model.integrations.length > 0 ? (
                  <SelectableList
                    items={model.integrations.map((integration) => ({
                      label: integration.name,
                      subLabel: integration.description,
                      icon: INTEGRATION_DEFINITIONS[
                        integration.type as IntegrationVariant
                      ].icon,
                    }))}
                  />
                ) : (
                  <SimpleEmptyState
                    title="No Connected Integrations"
                    helpText="Create your first integration then connect it to make it show up here."
                    icon={IntegrationIcon}
                    button={{
                      label: "Create Integration",
                      onClick: () =>
                        void router.push(
                          `/workspace/${model.workspaceId}/integrations?create=true`
                        ),
                    }}
                    shrink
                  />
                ),
            },
            {
              label: "Tools",
              icon: ToolIcon,
              body:
                model.tools.length > 0 ? (
                  <SelectableList
                    items={model.tools.map((tool) => ({
                      label: tool.name,
                      subLabel: tool.description,
                      icon: TOOL_DEFINITIONS[tool.type as ToolVariant].icon,
                    }))}
                  />
                ) : (
                  <SimpleEmptyState
                    title="No Connected Tools"
                    helpText="Create your first tool then connect it to make it show up here."
                    icon={ToolIcon}
                    button={{
                      label: "Create Tool",
                      onClick: () =>
                        void router.push(
                          `/workspace/${model.workspaceId}/tools?create=true`
                        ),
                    }}
                    shrink
                  />
                ),
            },
            {
              label: "Connectors",
              icon: ConnectorIcon,
              body:
                model.connectors.length > 0 ? (
                  <SelectableList
                    items={model.connectors.map((connector, index) => ({
                      label: connector.name,
                      subLabel:
                        CONNECTOR_DEFINITIONS[
                          connector.type as ConnectorVariant
                        ].description,
                      icon: CONNECTOR_DEFINITIONS[
                        connector.type as ConnectorVariant
                      ].icon,
                      onClick: () => setSelectedConnectorIndex(index),
                      selected: selectedConnectorIndex === index,
                      actionButtons: [
                        {
                          label: "Delete",
                          variant: "danger",
                          onClick: () => setSelectedDeleteConnectorIndex(index),
                        },
                        {
                          label: "Copy URL",
                          onClick: () => {
                            void navigator.clipboard.writeText(
                              `${window.location.origin}/playground?connectorId=${connector.id}`
                            );
                            addNotification({
                              variant: "success",
                              primaryText: "Copied!",
                              secondaryText:
                                "Connector URL copied to clipboard",
                            });
                          },
                        },
                      ],
                    }))}
                  />
                ) : (
                  <SimpleEmptyState
                    title="No Connectors"
                    helpText="Connectors enable you to access your model"
                    icon={ConnectorIcon}
                    button={{
                      label: "Create Connector",
                      onClick: () => setShowNewConnectorSideOver(true),
                    }}
                    shrink
                  />
                ),
            },
            {
              label: "Memory",
              icon: MemoryIcon,
              body: (
                <SimpleEmptyState
                  title="No Memory Sets"
                  helpText="When your model is configured to rember conversations, memory sets will be displayed here."
                  icon={MemoryIcon}
                  shrink
                />
              ),
            },
          ],
        }}
      />
    </>
  );
};

const useBasicDetails = (
  model: RouterOutputs["workspace"]["models"]["list"][0]
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this model",
      },
      field: {
        variant: "text",
        value: model.id,
      },
    },
    {
      label: {
        title: "Name",
        description: "The name of this model",
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
        description: "The description of this model",
      },
      field: {
        variant: "text",
        value: model.description,
      },
    });
  }

  return details;
};
