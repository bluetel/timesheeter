import { useState } from "react";
import { DeleteToolModal } from "./DeleteToolModal";
import { EditToolSideOver } from "./EditToolSideOver";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";
import {
  TOOLS_HELP_TEXT,
  TOOL_DEFINITIONS,
  type ToolVariant,
} from "@timesheeter/app/lib/workspace/tools";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";

type ToolPanelProps = {
  tool: RouterOutputs["workspace"]["tools"]["list"][0];
  refetchTools: () => unknown;
  onNewToolClick: () => void;
};

export const ToolPanel = ({
  tool,
  refetchTools,
  onNewToolClick,
}: ToolPanelProps) => {
  const [showEditToolSideOver, setShowEditToolSideOver] = useState(false);
  const [showDeleteToolModal, setShowDeleteToolModal] = useState(false);
  const toolDetails = useToolDetails(tool);

  return (
    <>
      <DeleteToolModal
        tool={tool}
        onClose={() => setShowDeleteToolModal(false)}
        show={showDeleteToolModal}
        refetchTools={refetchTools}
      />
      <EditToolSideOver
        show={showEditToolSideOver}
        onClose={() => setShowEditToolSideOver(false)}
        refetchTools={refetchTools}
        data={{
          new: false,
          tool,
        }}
        workspaceId={tool.workspaceId}
      />
      <DetailPanel
        header={{
          title: "Tools",
          description: TOOLS_HELP_TEXT,
          newButton: {
            label: "New Tool",
            onClick: onNewToolClick,
          },
        }}
        content={{
          name: tool.name,
          description: tool.description,
          icon: TOOL_DEFINITIONS[tool.type as ToolVariant].icon,
          endButtons: {
            onEdit: () => setShowEditToolSideOver(true),
            onDelete: () => setShowDeleteToolModal(true),
          },
        }}
        tabs={{
          multiple: false,
          body: <BasicDetailList items={toolDetails} />,
        }}
      />
    </>
  );
};

const useToolDetails = (
  model: RouterOutputs["workspace"]["tools"]["list"][0]
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this tool",
      },
      field: {
        variant: "text",
        value: model.id,
      },
    },
    {
      label: {
        title: "Name",
        description: "The name of this tool",
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
        description: "The description of this tool",
      },
      field: {
        variant: "text",
        value: model.description,
      },
    });
  }

  return details;
};
