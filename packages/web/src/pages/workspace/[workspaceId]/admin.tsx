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
  const { mutate } = api.workspace.adminTools.purgeTaskRaw.useMutation();

  // Show prompt to ask for
  const [taskId, setTaskId] = useState<string | null>(null);

  return (
    <div className="space-y-4 p-4">
      <input type="text" placeholder="Task ID" onChange={(e) => setTaskId(e.target.value.toString())} />
      <button
        onClick={() => {
          if (taskId) {
            mutate(
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
    </div>
  );
};

export default Admin;
