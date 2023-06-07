import { createServerSideHelpers } from "@trpc/react-query/server";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import superjson from "superjson";
import { WorkspaceLayout } from "@timesheeter/app/components/workspace/WorkspaceLayout";
import { appRouter } from "@timesheeter/app/server/api/root";
import { createTRPCContext } from "@timesheeter/app/server/api/trpc";
import { type RouterOutputs, api } from "@timesheeter/app/utils/api";
import { getWorkspaceInfoDiscrete } from "@timesheeter/app/server/lib/workspace-info";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import { ModelIcon } from "@timesheeter/app/styles/icons";
import { ModelPanel } from "@timesheeter/app/components/workspace/models/ModelPanel";
import { EditModelSideOver } from "@timesheeter/app/components/workspace/models/EditModelSideOver";
import { SimpleEmptyState } from "@timesheeter/app/components/ui/SimpleEmptyState";
import { SelectableList } from "@timesheeter/app/components/ui/SelectableList";
import { MODELS_HELP_TEXT } from "@timesheeter/app/lib/workspace/models";
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

  await helpers.workspace.models.list.prefetch({
    workspaceId: workspaceInfo.workspace.id,
  });

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };
};

const Models = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: models, refetch: refetchModels } =
    api.workspace.models.list.useQuery({
      workspaceId: workspaceInfo.workspace.id,
    });

  const [showNewModelSideOver, setShowNewModelSideOver] = useState(false);

  const [selectedModel, setSelectedModel] = useState<
    RouterOutputs["workspace"]["models"]["list"][0] | null
  >(null);

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewModelSideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    const foundMatch = models?.find((i) => i.id === selectedModel?.id);
    if (selectedModel && foundMatch) {
      setSelectedModel(foundMatch);
      return;
    }

    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(
        models[0] as RouterOutputs["workspace"]["models"]["list"][0]
      );
    } else if (models?.length === 0) {
      setSelectedModel(null);
    }

    if (selectedModel && !models?.find((i) => i.id === selectedModel.id)) {
      setSelectedModel(null);
    }
  }, [models, selectedModel]);

  const modelItems = useMemo(
    () =>
      models?.map((model) => ({
        label: model.name,
        icon: ModelIcon,
        onClick: () => setSelectedModel(model),
        selected: selectedModel?.id === model.id,
      })) ?? [],
    [models, selectedModel]
  );

  if (!models || modelItems.length === 0 || !selectedModel) {
    return (
      <>
        <EditModelSideOver
          show={showNewModelSideOver}
          onClose={() => setShowNewModelSideOver(false)}
          refetchModels={refetchModels}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Models"
            helpText={MODELS_HELP_TEXT}
            button={{
              label: "New Model",
              onClick: () => setShowNewModelSideOver(true),
            }}
            icon={ModelIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditModelSideOver
        show={showNewModelSideOver}
        onClose={() => setShowNewModelSideOver(false)}
        refetchModels={refetchModels}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList items={modelItems} />
          </nav>
        }
      >
        {models.map((model) => (
          <div
            key={model.id}
            className={model.id === selectedModel.id ? "" : "hidden"}
          >
            <ModelPanel
              model={model}
              refetchModels={refetchModels}
              onNewModelClick={() => setShowNewModelSideOver(true)}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default Models;
