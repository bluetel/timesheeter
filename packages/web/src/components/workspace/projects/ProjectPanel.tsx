import { ProjectIcon } from '@timesheeter/web/lib/workspace/projects';
import type { ParsedProject } from '@timesheeter/web/server/api/routers/workspace/projects';
import { EditProjectSideOver } from './EditProjectSideOver';
import { useState } from 'react';
import { DetailPanel } from '@timesheeter/web/components/ui/DetailPanel/DetailPanel';
import { DeleteProjectModal } from './DeleteProjectModal';
import { PROJECTS_HELP_TEXT } from '@timesheeter/web/lib/workspace/projects';
import { type RouterOutputs } from '@timesheeter/web/utils/api';
import { BasicDetailList, type BasicDetailListItem } from '@timesheeter/web/components/ui/DetailPanel/BasicDetailList';
import { type Project } from '@prisma/client';

type ProjectPanelProps = {
  project: ParsedProject<
    Project & {
      taskPrefixes: {
        id: string;
        prefix: string;
      }[];
    }
  >;
  refetchProjects: () => unknown;
  onNewProjectClick: () => void;
};

export const ProjectPanel = ({ project, refetchProjects, onNewProjectClick }: ProjectPanelProps) => {
  const [showEditProjectSideOver, setShowEditProjectSideOver] = useState(false);
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
        show={showEditProjectSideOver}
        onClose={() => setShowEditProjectSideOver(false)}
        refetchProjects={refetchProjects}
        data={{
          new: false,
          project,
        }}
        workspaceId={project.workspaceId}
      />
      <DetailPanel
        header={{
          title: 'Projects',
          description: PROJECTS_HELP_TEXT,
          newButton: {
            label: 'New project',
            onClick: onNewProjectClick,
          },
        }}
        content={{
          name: project.name,
          icon: ProjectIcon,
          endButtons: {
            onEdit: () => setShowEditProjectSideOver(true),
            onDelete: () => setShowDeleteProjectModal(true),
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

const useBasicDetails = (project: RouterOutputs['workspace']['projects']['list'][0]) => {
  const details: BasicDetailListItem[] = [
    {
      label: {
        title: 'ID',
        description: 'The unique identifier for this project',
      },
      field: {
        variant: 'text',
        value: project.id,
      },
    },
    {
      label: {
        title: 'Name',
        description: `Descriptive name for the project, e.g. "Acme Corp"`,
      },
      field: {
        variant: 'text',
        value: project.name,
      },
    },
    {
      label: {
        title: 'Task Prefixes',
        description: `Prefix that can be added to tasks created by this project, e.g. "AC" for "AC-1234"`,
      },
      field: {
        variant: 'text',
        value: project.taskPrefixes.map(({ prefix }) => prefix).join(', '),
      },
    },
  ];

  return details;
};
