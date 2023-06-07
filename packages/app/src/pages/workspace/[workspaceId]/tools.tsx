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
import { ToolIcon } from "@timesheeter/app/styles/icons";
import { EditToolSideOver } from "@timesheeter/app/components/workspace/tools/EditToolSideOver";
import {
  TOOLS_HELP_TEXT,
  TOOL_DEFINITIONS,
  type ToolVariant,
} from "@timesheeter/app/lib/workspace/tools";
import { ToolPanel } from "@timesheeter/app/components/workspace/tools/ToolPanel";
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

  await helpers.workspace.tools.list.prefetch({
    workspaceId: workspaceInfo.workspace.id,
  });

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };
};

const Tools = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: tools, refetch: refetchTools } =
    api.workspace.tools.list.useQuery({
      workspaceId: workspaceInfo.workspace.id,
    });

  const [showNewToolSideOver, setShowNewToolSideOver] = useState(false);

  const [selectedTool, setSelectedTool] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewToolSideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    if (tools && tools[0] && !selectedTool) {
      setSelectedTool({
        id: tools[0].id,
        index: 0,
      });
    } else if (tools?.length === 0) {
      setSelectedTool(null);
    }

    if (
      selectedTool !== null &&
      !tools?.find((t) => t.id === selectedTool.id)
    ) {
      setSelectedTool(null);
    }
  }, [tools, selectedTool]);

  const toolItems = useMemo(
    () =>
      tools?.map((tool) => {
        const toolDefinition = TOOL_DEFINITIONS[tool.type as ToolVariant];

        return {
          label: tool.name,
          subLabel: toolDefinition.name,
          icon: toolDefinition.icon,
          onClick: () =>
            setSelectedTool({
              id: tool.id,
              index: tools.findIndex((t) => t.id === tool.id),
            }),
          selected: selectedTool?.id === tool.id,
        };
      }) ?? [],
    [tools, selectedTool]
  );

  if (!tools || toolItems.length === 0) {
    return (
      <>
        <EditToolSideOver
          show={showNewToolSideOver}
          onClose={() => setShowNewToolSideOver(false)}
          refetchTools={refetchTools}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Tools"
            helpText={TOOLS_HELP_TEXT}
            button={{
              label: "New Tool",
              onClick: () => setShowNewToolSideOver(true),
            }}
            icon={ToolIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditToolSideOver
        show={showNewToolSideOver}
        onClose={() => setShowNewToolSideOver(false)}
        refetchTools={refetchTools}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList items={toolItems} />
          </nav>
        }
      >
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={selectedTool?.id === tool?.id ? "" : "hidden"}
          >
            <ToolPanel
              tool={tool}
              refetchTools={refetchTools}
              onNewToolClick={() => setShowNewToolSideOver(true)}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default Tools;
