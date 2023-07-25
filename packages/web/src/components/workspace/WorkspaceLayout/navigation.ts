import { HolidayIcon, IntegrationIcon, ProjectIcon, TaskIcon, TimesheetEntryIcon } from '@timesheeter/web/lib';
import { HomeIcon } from '@heroicons/react/24/outline';

type NavigationItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className: string }>;
};

export const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { name: 'Integrations', path: '/integrations', icon: IntegrationIcon },
  { name: 'Projects', path: '/projects', icon: ProjectIcon },
  { name: 'Tasks', path: '/tasks', icon: TaskIcon },
  {
    name: 'Timesheet Entries',
    path: '/timesheet-entries',
    icon: TimesheetEntryIcon,
  },
  { name: 'Holidays', path: '/holidays', icon: HolidayIcon },
] as NavigationItem[];
