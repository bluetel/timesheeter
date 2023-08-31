// import { env } from '../env';
import { api } from '../utils/api';

type DevToolsProps = {
  workspaceId: string;
};

export const DevTools = ({ workspaceId }: DevToolsProps) => {
  const { mutate: deleteProjects } = api.devTools.deleteProjects.useMutation();

  const { mutate: deleteTasks } = api.devTools.deleteTasks.useMutation();

  const { mutate: deleteTimesheetEntries } = api.devTools.deleteTimesheetEntries.useMutation();

  const { mutate: deleteTogglSyncRecords } = api.devTools.deleteTogglSyncRecords.useMutation();

  // if (!env.NEXT_PUBLIC_DEV_TOOLS_ENABLED) return <></>;
  return <></>;
  return (
    <div className="fixed bottom-0 left-0 z-50">
      <div className="flex flex-row items-end gap-2 p-2">
        <button
          className="rounded bg-red-500 py-2 px-4 font-bold text-white hover:bg-red-700"
          onClick={() => {
            if (confirm('Are you sure you want to delete all projects?')) {
              deleteProjects({ workspaceId });
            }
          }}
        >
          Delete all projects
        </button>
        <button
          className="rounded bg-red-500 py-2 px-4 font-bold text-white hover:bg-red-700"
          onClick={() => {
            if (confirm('Are you sure you want to delete all tasks?')) {
              deleteTasks({ workspaceId });
            }
          }}
        >
          Delete all tasks
        </button>
        <button
          className="rounded bg-red-500 py-2 px-4 font-bold text-white hover:bg-red-700"
          onClick={() => {
            if (confirm('Are you sure you want to delete all timesheet entries?')) {
              deleteTimesheetEntries({ workspaceId });
            }
          }}
        >
          Delete all timesheet entries
        </button>
        <button
          className="rounded bg-red-500 py-2 px-4 font-bold text-white hover:bg-red-700"
          onClick={() => {
            if (confirm('Are you sure you want to delete all Toggl sync records?')) {
              deleteTogglSyncRecords({ workspaceId });
            }
          }}
        >
          Delete all Toggl sync records
        </button>
      </div>
    </div>
  );
};
