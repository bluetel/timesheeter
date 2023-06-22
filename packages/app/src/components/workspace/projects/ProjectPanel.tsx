import {
  ProjectIcon,
  autoAssignTasksHelpText,
} from "@timesheeter/app/lib/workspace/projects";
import type { ParsedProject } from "@timesheeter/app/server/api/routers/workspace/projects";
import { EditProjectSideOver } from "./EditProjectSideOver";
import { useState } from "react";
import { DetailPanel } from "@timesheeter/app/components/ui/DetailPanel/DetailPanel";
import { DeleteProjectModal } from "./DeleteProjectModal";
import { PROJECTS_HELP_TEXT } from "@timesheeter/app/lib/workspace/projects";
import { type RouterOutputs } from "@timesheeter/app/utils/api";
import {
  BasicDetailList,
  type BasicDetailListItem,
} from "@timesheeter/app/components/ui/DetailPanel/BasicDetailList";
import {
  AdjustmentsVerticalIcon,
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/outline";
import { type IconType } from "react-icons";
import { SelectableList } from "../../ui/SelectableList";
import { SimpleEmptyState } from "../../ui/SimpleEmptyState";

type ProjectDetailProps = {
  project: ParsedProject;
  refetchProjects: () => unknown;
  onNewProjectClick: () => void;
};

export const ProjectPanel = ({
  project,
  refetchProjects,
  onNewProjectClick,
}: ProjectDetailProps) => {
  const [showEditProjectsideOver, setShowEditProjectsideOver] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);

  const basicDetails = useBasicDetails(project);

  return (
    <>
      <DeleteProjectModal
        project={project}
        onClose={() => setShowDeleteProjectModal(false)}
        show={showDeleteProjectModal}
        refetchProjects={refetchProjects}
      />
      <EditProjectSideOver
        show={showEditProjectsideOver}
        onClose={() => setShowEditProjectsideOver(false)}
        refetchProjects={refetchProjects}
        data={{
          new: false,
          project,
        }}
        workspaceId={project.workspaceId}
      />
      <DetailPanel
        header={{
          title: "Projects",
          description: PROJECTS_HELP_TEXT,
          newButton: {
            label: "New project",
            onClick: onNewProjectClick,
          },
        }}
        content={{
          name: project.name,
          icon: ProjectIcon,
          endButtons: {
            onEdit: () => setShowEditProjectsideOver(true),
            onDelete: () => setShowDeleteProjectModal(true),
          },
        }}
        tabs={{
          multiple: true,
          bodies: [
            {
              icon: AdjustmentsVerticalIcon as IconType,
              label: "Details",
              body: <BasicDetailList items={basicDetails} />,
            },
            {
              icon: ArrowPathRoundedSquareIcon as IconType,
              label: "Auto Assign Tasks",
              subDescription: autoAssignTasksHelpText,
              body:
                project.config.autoAssignTasks.length > 0 ? (
                  <SelectableList
                    items={project.config.autoAssignTasks.map((taskName) => ({
                      label: taskName,
                      subLabel: `e.g. ${taskName} - New feature discussion`,
                    }))}
                  />
                ) : (
                  <SimpleEmptyState
                    title="No auto assign tasks"
                    helpText="Edit the project to add auto assign tasks"
                    icon={ProjectIcon}
                    button={{
                      label: "Edit project",
                      onClick: () => setShowEditProjectsideOver(true),
                    }}
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
  project: RouterOutputs["workspace"]["projects"]["list"][0]
) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: "ID",
        description: "The unique identifier for this project",
      },
      field: {
        variant: "text",
        value: project.id,
      },
    },
    {
      label: {
        title: "Name",
        description: `Descriptive name for the project, e.g. "James's Toggl"`,
      },
      field: {
        variant: "text",
        value: project.name,
      },
    },
    {
      label: {
        title: "Task Prefix",
        description: `Prefix for tasks created by this project, e.g. "AC" for "AC-1234"`,
      },
      field: {
        variant: "text",
        value: project.taskPrefix ?? "",
      },
    },
  ];

  return details;
};
