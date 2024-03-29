// import { createServerSideHelpers } from '@trpc/react-query/server';
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
// import superjson from 'superjson';
import { WorkspaceLayout } from '@timesheeter/web/components/workspace/WorkspaceLayout';
// import { appRouter } from '@timesheeter/web/server/api/root';
// import { createTRPCContext } from '@timesheeter/web/server/api/trpc';
import { api } from '@timesheeter/web/utils/api';
import { type WorkspaceInfo, getWorkspaceInfoDiscrete } from '@timesheeter/web/server/lib/workspace-info';
import { useEffect, useMemo, useState } from 'react';
import { EditHolidaySideOver } from '@timesheeter/web/components/workspace/holidays/EditHolidaySideOver';
import { HolidayPanel } from '@timesheeter/web/components/workspace/holidays/HolidayPanel';
import { HOLIDAYS_HELP_TEXT } from '@timesheeter/web/lib/workspace/holidays';
import { HolidayIcon } from '@timesheeter/web/lib';
import { SimpleEmptyState } from '@timesheeter/web/components/ui/SimpleEmptyState';
import { SelectableList } from '@timesheeter/web/components/ui/SelectableList';
import { useRouter } from 'next/router';

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
        trpcState: unknown;
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

  // Holidays are currently disabled
  return {
    notFound: true,
  };

  /*
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext({
      req: context.req,
      res: context.res,
    }),
    transformer: superjson,
  });

  await helpers.workspace.holidays.list.prefetch({
    workspaceId: workspaceInfo.workspace.id,
  });

  return {
    props: {
      workspaceInfo,
      trpcState: helpers.dehydrate(),
    },
  };*/
};

const Holidays = ({ workspaceInfo }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: holidays, refetch: refetchHolidays } = api.workspace.holidays.list.useQuery({
    workspaceId: workspaceInfo.workspace.id,
  });

  const [showNewHolidaySideOver, setShowNewHolidaySideOver] = useState(false);

  const [selectedHoliday, setSelectedHoliday] = useState<{
    id: string;
    index: number;
  } | null>(null);

  const { query } = useRouter();
  useEffect(() => {
    if (query.create) {
      setShowNewHolidaySideOver(true);
    }
  }, [query.create]);

  useEffect(() => {
    if (holidays && holidays[0] && !selectedHoliday) {
      setSelectedHoliday({
        id: holidays[0].id,
        index: 0,
      });
    } else if (holidays?.length === 0) {
      setSelectedHoliday(null);
    }

    if (selectedHoliday !== null && !holidays?.find((i) => i.id === selectedHoliday.id)) {
      setSelectedHoliday(null);
    }
  }, [holidays, selectedHoliday]);

  const holidayItems = useMemo(
    () =>
      holidays?.map((holiday) => {
        const displayPeriod = `${holiday.start.toLocaleDateString('en-GB')} - ${holiday.end.toLocaleDateString(
          'en-GB'
        )}`;

        return {
          label: holiday.description ?? displayPeriod,
          subLabel: holiday.description ? displayPeriod : undefined,
          icon: HolidayIcon,
          onClick: () =>
            setSelectedHoliday({
              id: holiday.id,
              index: holidays.findIndex((i) => i.id === holiday.id),
            }),
          selected: selectedHoliday?.id === holiday.id,
        };
      }) ?? [],
    [holidays, selectedHoliday]
  );

  if (!holidays || holidayItems.length === 0) {
    return (
      <>
        <EditHolidaySideOver
          show={showNewHolidaySideOver}
          onClose={() => setShowNewHolidaySideOver(false)}
          refetchHolidays={refetchHolidays}
          data={{
            new: true,
          }}
          workspaceId={workspaceInfo.workspace.id}
        />
        <WorkspaceLayout workspaceInfo={workspaceInfo}>
          <SimpleEmptyState
            title="No Holidays"
            helpText={HOLIDAYS_HELP_TEXT}
            button={{
              label: 'New holiday',
              onClick: () => setShowNewHolidaySideOver(true),
            }}
            icon={HolidayIcon}
          />
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <EditHolidaySideOver
        show={showNewHolidaySideOver}
        onClose={() => setShowNewHolidaySideOver(false)}
        refetchHolidays={refetchHolidays}
        data={{ new: true }}
        workspaceId={workspaceInfo.workspace.id}
      />
      <WorkspaceLayout
        workspaceInfo={workspaceInfo}
        secondAside={
          <nav className="h-full overflow-y-auto">
            <SelectableList items={holidayItems} />
          </nav>
        }
      >
        {holidays.map((holiday) => (
          <div key={holiday.id} className={holiday.id === selectedHoliday?.id ? '' : 'hidden'}>
            <HolidayPanel
              holiday={holiday}
              refetchHolidays={refetchHolidays}
              onNewHolidayClick={() => setShowNewHolidaySideOver(true)}
            />
          </div>
        ))}
      </WorkspaceLayout>
    </>
  );
};

export default Holidays;
