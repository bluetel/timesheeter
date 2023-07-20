import { createTRPCRouter } from '@timesheeter/web/server/api/trpc';
import { listTasksProcedure } from './list';
import { listMinimalTasksProcedure } from './list-minimal';
import { createTaskProcedure } from './create';
import { updateTaskProcedure } from './update';
import { deleteTaskProcedure } from './delete';

export const tasksRouter = createTRPCRouter({
  list: listTasksProcedure,
  listMinimal: listMinimalTasksProcedure,
  create: createTaskProcedure,
  update: updateTaskProcedure,
  delete: deleteTaskProcedure,
});

export * from './lib';
