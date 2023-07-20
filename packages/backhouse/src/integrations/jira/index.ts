import { getPrismaClient, ParsedIntegration } from '@timesheeter/web';
import { ThrottledJiraClient } from './throttled-client';
import { z } from 'zod';

type JiraIntegration = ParsedIntegration & {
  config: {
    type: 'JiraIntegration';
  };
};

export const handleJiraIntegration = async ({ integration }: { integration: JiraIntegration }) => {
  const prisma = await getPrismaClient();

  const jiraClient = new ThrottledJiraClient({
    protocol: 'https',
    host: integration.config.host,
    username: integration.config.username,
    password: integration.config.apiKey,
    apiVersion: '2',
    strictSSL: true,
  });

  // only get tasks with no name
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: integration.workspaceId,
      name: null,
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

  return Promise.all(
    tasks.map(async (task) => {
      if (!task.ticketForTask || task.ticketForTask.jiraTicketId) {
        return;
      }

      const issueNumber = `${task.ticketForTask.taskPrefix.prefix}-${task.ticketForTask.number}`;

      const jiraTicket = await jiraClient.findIssue(issueNumber).catch(() => null);

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
