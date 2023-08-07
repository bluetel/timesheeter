import { devToolsEnabled } from "../lib"
import { api } from "../utils/api"

type DevToolsProps = {
  workspaceId: string
}

export const DevTools = ({ workspaceId }: DevToolsProps) => {
  const { mutate: deleteProjects } = api.devTools.deleteProjects.useMutation()

  const { mutate: deleteTasks } = api.devTools.deleteTasks.useMutation()

  const { mutate: deleteTimesheetEntries } = api.devTools.deleteTimesheetEntries.useMutation()

  const { mutate: deleteTogglSyncRecords } = api.devTools.deleteTogglSyncRecords.useMutation()

  if (!devToolsEnabled()) return <></>

  return (
    <div className="fixed bottom-0 left-0 z-50">
      <div className="flex flex-row items-end gap-2 p-2">
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            if (confirm("Are you sure you want to delete all projects?")) {
              deleteProjects({ workspaceId })
            }
          }}
        >
          Delete all projects
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            if (confirm("Are you sure you want to delete all tasks?")) {
              deleteTasks({ workspaceId })
            }
          }}
        >
          Delete all tasks
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            if (confirm("Are you sure you want to delete all timesheet entries?")) {
              deleteTimesheetEntries({ workspaceId })
            }
          }}
        >
          Delete all timesheet entries
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            if (confirm("Are you sure you want to delete all Toggl sync records?")) {
              deleteTogglSyncRecords({ workspaceId })
            }
          }}
        >
          Delete all Toggl sync records
        </button>
      </div>
    </div>
  )
}