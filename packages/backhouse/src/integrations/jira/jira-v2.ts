import { getPrismaClient, type ParsedIntegration, type PrismaClient } from '@timesheeter/web';
import { ThrottledJiraClient } from './throttled-client';
import { z } from 'zod';

type JiraIntegration = ParsedIntegration & {
  config: {
    type: 'JiraIntegrationV2';
  };
};

export const handleV2JiraIntegration = async ({ integration }: { integration: JiraIntegration }) => {
  const prisma = await getPrismaClient();

  const jiraClient = new ThrottledJiraClient({
    protocol: 'https',
    host: integration.config.host,
    username: integration.config.username,
    password: integration.config.apiKey,
    apiVersion: '2',
    strictSSL: true,
  });

  // A prefix may have been deleted so we need to filter out any that don't exist
  const filteredTaskPrefixIds = await prisma.taskPrefix
    .findMany({
      where: {
        workspaceId: integration.workspaceId,
      },
      select: {
        id: true,
      },
    })
    .then((taskPrefixes) =>
      taskPrefixes
        .filter((taskPrefix) => integration.config.taskPrefixIds.includes(taskPrefix.id))
        .map((taskPrefix) => taskPrefix.id)
    );

  const tasks = await getTasksToFetchIssues({
    prisma,
    privateUserId: integration.privateUserId,
    workspaceId: integration.workspaceId,
    taskPrefixIds: filteredTaskPrefixIds,
  });

  return Promise.all(
    tasks.map(async (task) => {
      if (!task.ticketForTask || task.ticketForTask.jiraTicketId) {
        return;
      }

      const issueNumber = `${task.ticketForTask.taskPrefix.prefix}-${task.ticketForTask.number}`;

      const jiraTicket = await jiraClient.findIssue(issueNumber).catch(() => {
        return null;
      });

      if (!jiraTicket) {
        return;
      }

      const parsedTicket = jiraIssueSchema.parse(jiraTicket);

      return prisma.task.update({
        where: {
          id: task.id,
        },
        data: {
          name: parsedTicket.fields.summary,
          ticketForTask: {
            update: {
              jiraTicketId: parsedTicket.id,
            },
          },
        },
      });
    })
  );
};

const jiraIssueSchema = z.object({
  id: z.string(),
  fields: z.object({
    summary: z.string(),
  }),
});

const getTasksToFetchIssues = async ({
  prisma,
  privateUserId,
  workspaceId,
  taskPrefixIds,
}: {
  prisma: PrismaClient;
  privateUserId: string | null;
  workspaceId: string;
  taskPrefixIds: string[];
}) => {
  // only get tasks with no jira ticket id
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      ticketForTask: {
        jiraTicketId: null,
        taskPrefix: { id: { in: taskPrefixIds } },
      },
      deleted: false,
      // if privateUserId is not null, only get tasks where that user has worked
      // on time entries
      timesheetEntries: privateUserId
        ? {
            some: {
              userId: privateUserId,
              deleted: false,
            },
          }
        : undefined,
    },
    select: {
      id: true,
      ticketForTask: {
        select: {
          number: true,
          jiraTicketId: true,
          taskPrefix: {
            select: {
              prefix: true,
            },
          },
        },
      },
    },
  });

  return tasks;
};
