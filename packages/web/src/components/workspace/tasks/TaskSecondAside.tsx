import { type RouterOutputs } from '@timesheeter/web/utils/api';
import { ListFilter } from '../../ui/ListFilter';
import { SelectableList } from '../../ui/SelectableList';
import { type IconType } from 'react-icons';
import { ProjectIcon } from '@timesheeter/web/lib';
import { useTaskFilterPreferences } from '@timesheeter/web/contexts/workspace/task-filter-preferences';
import { XMarkIcon } from '@heroicons/react/20/solid';

type TaskSecondAsideProps = {
  projects: RouterOutputs['workspace']['projects']['listMinimal'];
  taskItems: {
    label: string;
    onClick: () => unknown;
    icon: IconType;
  }[];
  loadMoreCallback?: () => unknown;
};

export const TaskSecondAside = ({ taskItems, projects, loadMoreCallback }: TaskSecondAsideProps) => {
  const taskFilters = useTaskFilters({ projects: projects ?? [] });

  return (
    <div className="flex h-full flex-col">
      <ListFilter filters={taskFilters} />
      <nav className="h-full overflow-y-auto">
        <SelectableList items={taskItems} loadMore={loadMoreCallback} />
      </nav>
    </div>
  );
};

const useTaskFilters = ({ projects }: { projects: RouterOutputs['workspace']['projects']['listMinimal'] }) => {
  const filters: ListFilter[] = [];

  const { taskFilterPreferences, saveTaskFilterPreferences } = useTaskFilterPreferences();

  const activeProject = projects.find((project) => project.id === taskFilterPreferences?.projectId);

  if (!projects) {
    return filters;
  }

  filters.push({
    variant: 'select-group-filter',
    label: {
      active: !!activeProject,
      text: activeProject ? `Project: ${activeProject.name}` : 'Project: All',
    },
    groups: [
      {
        items: projects.map((project) => ({
          label: project.name,
          onClick: () =>
            saveTaskFilterPreferences({
              ...taskFilterPreferences,
              projectId: project.id,
            }),

          icon: ProjectIcon,
          active: project.id === activeProject?.id,
        })),
      },
      {
        items: [
          {
            label: 'Clear project',
            onClick: () =>
              saveTaskFilterPreferences({
                ...taskFilterPreferences,
                projectId: undefined,
              }),
            icon: XMarkIcon as IconType,
            active: false,
          },
        ],
      },
    ],
    onClearFilter: () =>
      saveTaskFilterPreferences({
        ...taskFilterPreferences,
        projectId: undefined,
      }),
  });

  return filters;
};
