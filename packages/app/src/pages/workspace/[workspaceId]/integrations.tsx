import { createServerSideHelpers } from "@trpc/react-query/server";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import superjson from "superjson";
import { WorkspaceLayout } from "@timesheeter/app/components/workspace/WorkspaceLayout";
import { appRouter } from "@timesheeter/app/server/api/root";
import { createTRPCContext } from "@timesheeter/app/server/api/trpc";
import { api } from "@timesheeter/app/utils/api";
import { getWorkspaceInfoDiscrete } from "@timesheeter/app/server/lib/workspace-info";
import { useEffect, useMemo, useState } from "react";
import { EditIntegrationSideOver } from "@timesheeter/app/components/workspace/integrations/EditIntegrationSideOver";
import { IntegrationPanel } from "@timesheeter/app/components/workspace/integrations/IntegrationPanel";
import {
  INTEGRATIONS_HELP_TEXT,
  INTEGRATION_DEFINITIONS,
} from "@timesheeter/app/lib/workspace/integrations";
import { IntegrationIcon } from "@timesheeter/app/styles/icons";
import { SimpleEmptyState } from "@timesheeter/app/components/ui/SimpleEmptyState";
import { SelectableList } from "@timesheeter/app/components/ui/SelectableList";
import { useRouter } from "next/router";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { redirect, props: workspaceInfo } = await getWorkspaceInfoDiscrete(
    context
  );

  if (redirect) {
    return { redirect };
  }

  if (!workspaceInfo) {
    return {
      notFound: true,
    };
  }

  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext({
      req: context.req,
      res: context.res,
    }),
    transformer: superjson,
  });

  await helpers.workspace.integrations.list.prefetch({
    workspaceId: workspaceInfo.workspace.id,
  });

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };
};

const Integrations = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: integrations, refetch: refetchIntegrations } =
    api.workspace.integrations.list.useQuery({
      workspaceId: workspaceInfo.workspace.id,
    });

  const [showNewIntegrationSideOver, setShowNewIntegrationSideOver] =
    useState(false);

  const [selectedIntegration, setSelectedIntegration] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewIntegrationSideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    if (integrations && integrations[0] && !selectedIntegration) {
      setSelectedIntegration({
        id: integrations[0].id,
        index: 0,
      });
    } else if (integrations?.length === 0) {
      setSelectedIntegration(null);
    }

    if (
      selectedIntegration !== null &&
      !integrations?.find((i) => i.id === selectedIntegration.id)
    ) {
      setSelectedIntegration(null);
    }
  }, [integrations, selectedIntegration]);

  const integrationItems = useMemo(
    () =>
      integrations?.map((integration) => {
        const integrationDefinition =
          INTEGRATION_DEFINITIONS[integration.config.type];

        return {
          label: integration.name,
          subLabel: integrationDefinition.name,
          icon: integrationDefinition.icon,
          onClick: () =>
            setSelectedIntegration({
              id: integration.id,
              index: integrations.findIndex((i) => i.id === integration.id),
            }),
          selected: selectedIntegration?.id === integration.id,
        };
      }) ?? [],
    [integrations, selectedIntegration]
  );

  if (!integrations || integrationItems.length === 0) {
    return (
      <>
        <EditIntegrationSideOver
          show={showNewIntegrationSideOver}
          onClose={() => setShowNewIntegrationSideOver(false)}
          refetchIntegrations={refetchIntegrations}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Integrations"
            helpText={INTEGRATIONS_HELP_TEXT}
            button={{
              label: "New Integration",
              onClick: () => setShowNewIntegrationSideOver(true),
            }}
            icon={IntegrationIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditIntegrationSideOver
        show={showNewIntegrationSideOver}
        onClose={() => setShowNewIntegrationSideOver(false)}
        refetchIntegrations={refetchIntegrations}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList items={integrationItems} />
          </nav>
        }
      >
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={
              integration.id === selectedIntegration?.id ? "" : "hidden"
            }
          >
            <IntegrationPanel
              integration={integration}
              refetchIntegrations={refetchIntegrations}
              onNewIntegrationClick={() => setShowNewIntegrationSideOver(true)}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default Integrations;
