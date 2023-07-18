import { createServerSideHelpers } from "@trpc/react-query/server";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import superjson from "superjson";
import { WorkspaceLayout } from "@timesheeter/web/components/workspace/WorkspaceLayout";
import { appRouter } from "@timesheeter/web/server/api/root";
import { createTRPCContext } from "@timesheeter/web/server/api/trpc";
import { api } from "@timesheeter/web/utils/api";
import { type WorkspaceInfo, getWorkspaceInfoDiscrete } from "@timesheeter/web/server/lib/workspace-info";
import { useEffect, useMemo, useState } from "react";
import { ProjectPanel } from "@timesheeter/web/components/workspace/projects/ProjectPanel";
import { PROJECTS_HELP_TEXT } from "@timesheeter/web/lib/workspace/projects";
import { ProjectIcon } from "@timesheeter/web/lib";
import { SimpleEmptyState } from "@timesheeter/web/components/ui/SimpleEmptyState";
import { SelectableList } from "@timesheeter/web/components/ui/SelectableList";
import { useRouter } from "next/router";
import { EditProjectSideOver } from "@timesheeter/web/components/workspace/projects/EditProjectSideOver";

type GetServerSidePropsResult = {
  redirect: {
    destination: string;
    permanent: boolean;
  }
} | {
  props: {
    workspaceInfo: WorkspaceInfo
    trpcState: unknown
  };
} | {
  notFound: true
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult> => {
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

  await helpers.workspace.projects.list.prefetch({
    workspaceId: workspaceInfo.workspace.id,
  });

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };
};

const Projects = ({
  workspaceInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: projects, refetch: refetchProjects } =
    api.workspace.projects.list.useQuery({
      workspaceId: workspaceInfo.workspace.id,
    });

  const [showNewProjectSideOver, setShowNewProjectSideOver] = useState(false);

  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewProjectSideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    if (projects && projects[0] && !selectedProject) {
      setSelectedProject({
        id: projects[0].id,
        index: 0,
      });
    } else if (projects?.length === 0) {
      setSelectedProject(null);
    }

    if (
      selectedProject !== null &&
      !projects?.find((i) => i.id === selectedProject.id)
    ) {
      setSelectedProject(null);
    }
  }, [projects, selectedProject]);

  const projectItems = useMemo(
    () =>
      projects?.map((project) => ({
        label: project.name,
        subLabel: project.taskPrefix ? `${project.taskPrefix}-XXXX` : undefined,
        icon: ProjectIcon,
        onClick: () =>
          setSelectedProject({
            id: project.id,
            index: projects.findIndex((i) => i.id === project.id),
          }),
        selected: selectedProject?.id === project.id,
      })) ?? [],
    [projects, selectedProject]
  );

  if (!projects || projectItems.length === 0) {
    return (
      <>
        <EditProjectSideOver
          show={showNewProjectSideOver}
          onClose={() => setShowNewProjectSideOver(false)}
          refetchProjects={refetchProjects}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Projects"
            helpText={PROJECTS_HELP_TEXT}
            button={{
              label: "New project",
              onClick: () => setShowNewProjectSideOver(true),
            }}
            icon={ProjectIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditProjectSideOver
        show={showNewProjectSideOver}
        onClose={() => setShowNewProjectSideOver(false)}
        refetchProjects={refetchProjects}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList items={projectItems} />
          </nav>
        }
      >
        {projects.map((project) => (
          <div
            key={project.id}
            className={project.id === selectedProject?.id ? "" : "hidden"}
          >
            <ProjectPanel
              project={project}
              refetchProjects={refetchProjects}
              onNewProjectClick={() => setShowNewProjectSideOver(true)}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default Projects;
