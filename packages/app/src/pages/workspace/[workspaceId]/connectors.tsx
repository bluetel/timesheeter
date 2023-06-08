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
import { EditConnectorSideOver } from "@timesheeter/app/components/workspace/connectors/EditConnectorSideOver";
import { ConnectorPanel } from "@timesheeter/app/components/workspace/connectors/ConnectorPanel";
import {
  CONNECTORS_HELP_TEXT,
  CONNECTOR_DEFINITIONS,
} from "@timesheeter/app/lib/workspace/connectors";
import { ConnectorIcon } from "@timesheeter/app/styles/icons";
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

  await helpers.workspace.connectors.list.prefetch({
    workspaceId: workspaceInfo.workspace.id,
  });

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };
};

const Connectors = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: connectors, refetch: refetchConnectors } =
    api.workspace.connectors.list.useQuery({
      workspaceId: workspaceInfo.workspace.id,
    });

  const [showNewConnectorSideOver, setShowNewConnectorSideOver] =
    useState(false);

  const [selectedConnector, setSelectedConnector] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewConnectorSideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    if (connectors && connectors[0] && !selectedConnector) {
      setSelectedConnector({
        id: connectors[0].id,
        index: 0,
      });
    } else if (connectors?.length === 0) {
      setSelectedConnector(null);
    }

    if (
      selectedConnector !== null &&
      !connectors?.find((i) => i.id === selectedConnector.id)
    ) {
      setSelectedConnector(null);
    }
  }, [connectors, selectedConnector]);

  const connectorItems = useMemo(
    () =>
      connectors?.map((connector) => {
        const connectorDefinition =
          CONNECTOR_DEFINITIONS[connector.config.type];

        return {
          label: connector.name,
          subLabel: connectorDefinition.name,
          icon: connectorDefinition.icon,
          onClick: () =>
            setSelectedConnector({
              id: connector.id,
              index: connectors.findIndex((i) => i.id === connector.id),
            }),
          selected: selectedConnector?.id === connector.id,
        };
      }) ?? [],
    [connectors, selectedConnector]
  );

  if (!connectors || connectorItems.length === 0) {
    return (
      <>
        <EditConnectorSideOver
          show={showNewConnectorSideOver}
          onClose={() => setShowNewConnectorSideOver(false)}
          refetchConnectors={refetchConnectors}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Connectors"
            helpText={CONNECTORS_HELP_TEXT}
            button={{
              label: "New Connector",
              onClick: () => setShowNewConnectorSideOver(true),
            }}
            icon={ConnectorIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditConnectorSideOver
        show={showNewConnectorSideOver}
        onClose={() => setShowNewConnectorSideOver(false)}
        refetchConnectors={refetchConnectors}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList items={connectorItems} />
          </nav>
        }
      >
        {connectors.map((connector) => (
          <div
            key={connector.id}
            className={
              connector.id === selectedConnector?.id ? "" : "hidden"
            }
          >
            <ConnectorPanel
              connector={connector}
              refetchConnectors={refetchConnectors}
              onNewConnectorClick={() => setShowNewConnectorSideOver(true)}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default Connectors;
