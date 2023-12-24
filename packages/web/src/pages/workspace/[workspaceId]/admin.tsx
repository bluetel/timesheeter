import { useState } from 'react';
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { getWorkspaceInfoDiscrete, type WorkspaceInfo } from '@timesheeter/web/server';
import { api } from '@timesheeter/web/utils/api';

type GetServerSidePropsResult =
  | {
      redirect: {
        destination: string;
        permanent: boolean;
      };
    }
  | {
      props: {
        workspaceInfo: WorkspaceInfo;
      };
    }
  | {
      notFound: true;
    };

export const getServerSideProps = async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult> => {
  const { redirect, props: workspaceInfo } = await getWorkspaceInfoDiscrete(context);

  if (redirect) {
    return { redirect };
  }

  if (!workspaceInfo) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      workspaceInfo,
    },
  };
};

const Admin = ({ workspaceInfo }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { mutate: purgeTaskRaw } = api.workspace.adminTools.purgeTaskRaw.useMutation();
  const { mutate: purgeTimesheetEntryRaw } = api.workspace.adminTools.purgeTimesheetEntryRaw.useMutation();

  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);
  const [targetTimesheetEntryId, setTargetTimesheetEntryId] = useState<string | null>(null);

  const { data: taskData } = api.workspace.adminTools.listAllTimesheetEntriesOfTask.useQuery({
    taskId: targetTaskId,
    workspaceId: workspaceInfo.workspace.id,
  });

  const { data: timesheetEntryData } = api.workspace.adminTools.retrieveTimesheetEntryRaw.useQuery({
    timesheetEntryId: targetTimesheetEntryId,
    workspaceId: workspaceInfo.workspace.id,
  });

  // Show prompt to ask for
  const [taskId, setTaskId] = useState<string | null>(null);

  return (
    <div className="space-y-4 p-4">
      <input type="text" placeholder="Task ID" onChange={(e) => setTaskId(e.target.value.toString())} />
      <button
        onClick={() => {
          if (taskId) {
            purgeTaskRaw(
              {
                taskId,
                workspaceId: workspaceInfo.workspace.id,
              },
              {
                onSuccess: () => {
                  alert('Task purged');
                },

                onError: (error) => {
                  alert(`Error purging task: ${error.message}`);
                },
              }
            );
          }
        }}
      >
        Purge task raw
      </button>

      <input type="text" placeholder="Timesheet entry ID" onChange={(e) => setTaskId(e.target.value.toString())} />
      <button
        onClick={() => {
          if (taskId) {
            purgeTimesheetEntryRaw(
              {
                timesheetEntryId: taskId,
                workspaceId: workspaceInfo.workspace.id,
              },
              {
                onSuccess: () => {
                  alert('Timesheet entry purged');
                },

                onError: (error) => {
                  alert(`Error purging timesheet entry: ${error.message}`);
                },
              }
            );
          }
        }}
      >
        Purge timesheet entry raw
      </button>

      <div className="space-y-4">
        <h2>Find timesheet entries of task</h2>
        <input type="text" placeholder="Task ID" onChange={(e) => setTargetTaskId(e.target.value.toString())} />
        {taskData?.taskWithTimesheetEntries ? (
          <>
            <h3>Task</h3>
            <p>
              <strong>Name:</strong> {taskData.taskWithTimesheetEntries.name}
            </p>
            <p>
              <strong>Toggl task id ID:</strong> {taskData.taskWithTimesheetEntries.togglTaskId?.toString() ?? 'N/A'}
            </p>
            <h4>
              <strong>Timesheet entries:</strong>
            </h4>
            <div className="space-y-4">
              {taskData.taskWithTimesheetEntries.timesheetEntries.map((timesheetEntry) => (
                <div key={timesheetEntry.id}>
                  <p>
                    <strong>ID:</strong> {timesheetEntry.id}
                  </p>

                  <p>
                    <strong>CreatedAt:</strong> {timesheetEntry.createdAt.toISOString()}
                  </p>
                  <p>
                    <strong>UpdatedAt:</strong> {timesheetEntry.updatedAt.toISOString()}
                  </p>
                  <p>
                    <strong>Duration:</strong> {timesheetEntry.start.toISOString()} - {timesheetEntry.end.toISOString()}
                  </p>
                  <p>
                    <strong>User name:</strong> {timesheetEntry.user.name} ({timesheetEntry.user.email})
                  </p>
                  <p>
                    <strong>Description:</strong> {timesheetEntry.description}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>No task found</p>
        )}
      </div>

      <div className="space-y-4">
        <h2>See if timesheet entry exists</h2>
        <input
          type="text"
          placeholder="Timesheet entry ID"
          onChange={(e) => setTargetTimesheetEntryId(e.target.value.toString())}
        />
        {timesheetEntryData?.timesheetEntry ? (
          <>
            <h3>Timesheet entry</h3>
            <p>
              <strong>ID:</strong> {timesheetEntryData.timesheetEntry.id}
            </p>
            <p>
              <strong>CreatedAt:</strong> {timesheetEntryData.timesheetEntry.createdAt.toISOString()}
            </p>
            <p>
              <strong>User:</strong> {timesheetEntryData.timesheetEntry.user.name} (
              {timesheetEntryData.timesheetEntry.user.email})
            </p>
            <p>
              <strong>Description:</strong> {timesheetEntryData.timesheetEntry.description}
            </p>
            <p>
              <strong>Duration:</strong> {timesheetEntryData.timesheetEntry.start.toISOString()} -{' '}
              {timesheetEntryData.timesheetEntry.end.toISOString()}
            </p>
            <p>
              <strong>Task:</strong> {timesheetEntryData.timesheetEntry.task.name} Toggl task (
              {timesheetEntryData.timesheetEntry.task.togglTaskId?.toString() ?? 'N/A'})
            </p>
            <p>
              <strong>togglTimeEntryId:</strong>{' '}
              {timesheetEntryData.timesheetEntry.togglTimeEntryId?.toString() ?? 'N/A'}
            </p>
          </>
        ) : (
          <p>No timesheet entry found</p>
        )}
      </div>
    </div>
  );
};

export default Admin;
