import {
  ProjectIcon, autoAssignTasksHelpText,
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
import { AdjustmentsVerticalIcon, ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import { type IconType } from "react-icons";

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
  const [showEditProjectsideOver, setShowEditProjectsideOver] =
    useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] =
    useState(false);

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
              body: <BasicDetailList items={basicDetails} />
            }, {
              icon: ArrowPathRoundedSquareIcon as IconType,
              label: "Auto Assign Tasks",
              subDescription: autoAssignTasksHelpText,
              body: <dl className="sm:divide-y sm:divide-gray-200">
                {project.config.autoAssignTasks.map((taskName, index) => (
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5" key={index}>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-900">
                        {taskName}
                      </dt>
                    </div>
                  </div>
                ))}
              </dl>
            },
          ]
        }}
      />
    </>
  );
}

const useBasicDetails = (
  project: RouterOutputs["workspace"]["projects"]["list"][0],
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
        description: `Descriptive name for the project, e.g. "James's Toggl"`
      },
      field: {
        variant: "text",
        value: project.name,
      },
    },
    {
      label: {
        title: "Task Prefix",
        description: `Prefix for tasks created by this project, e.g. "NA" for "NA-1234"`,
      },
      field: {
        variant: "text",
        value: project.taskPrefix,

      }
    }
  ];

  // projectDetail.fields.forEach((field) => {
  //   const value =
  //     ((project.config as Record<string, unknown>)[field.accessor] as string) ??
  //     "";

  // Skip auto assign tasks field
  //   if (field.accessor === "autoAssignTasks") {
  //     return;
  //   }

  //   details.push({
  //     label: {
  //       title: field.name,
  //       description: field.description,
  //     },
  //     field: {
  //       variant: "text",
  //       value,
  //     },
  //   });
  // });

  return details;
};
