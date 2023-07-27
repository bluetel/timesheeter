import { type PrismaClient } from './db';

export const deleteProject = async ({ prisma, projectId }: { prisma: PrismaClient; projectId: string }) => {
  const deletedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      deleted: true,
    },
    select: {
      tasks: {
        select: {
          id: true,
        },
      },
    },
  });

  await prisma.taskPrefix.deleteMany({
    where: {
      projectId,
    },
  });

  await Promise.all(deletedProject.tasks.map(async (task) => deleteTask({ prisma, taskId: task.id })));

  return deletedProject;
};

export const deleteTask = async ({ prisma, taskId }: { prisma: PrismaClient; taskId: string }) => {
  const deletedTask = await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      deleted: true,
    },
    select: {
      id: true,
      timesheetEntries: {
        select: {
          id: true,
        },
      },
    },
  });

  await prisma.ticketForTask.deleteMany({
    where: {
      taskId,
    },
  });

  await Promise.all(
    deletedTask.timesheetEntries.map(async (timesheetEntry) =>
      deleteTimesheetEntry({ prisma, timesheetEntryId: timesheetEntry.id })
    )
  );

  return deletedTask;
};

export const deleteTimesheetEntry = async ({
  prisma,
  timesheetEntryId,
}: {
  prisma: PrismaClient;
  timesheetEntryId: string;
}) => {
  const deletedTimesheetEntry = await prisma.timesheetEntry.update({
    where: {
      id: timesheetEntryId,
    },
    data: {
      deleted: true,
    },
    select: {
      id: true,
    },
  });

  return deletedTimesheetEntry;
};
