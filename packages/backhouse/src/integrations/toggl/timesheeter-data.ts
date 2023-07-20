// import { PrismaClient, parseTask } from '@timesheeter/web';

// export const getAllTimesheeterData = async ({ workspaceId, prisma }: { workspaceId: string; prisma: PrismaClient }) => {
//   const projectsPromise = prisma.project.findMany({
//     where: {
//       workspaceId,
//     },
//     select: timesheeterProjectSelectQuery,
//   });

//   const tasksPromise = prisma.task
//     .findMany({
//       where: {
//         workspaceId,
//       },
//       select: {
//         id: true,
//         updatedAt: true,
//         name: true,
//         projectId: true,
//         togglTaskId: true,
//         configSerialized: true,
//         ticketForTask: {
//           select: {
//             id: true,
//             number: true,
//             taskPrefix: {
//               select: {
//                 id: true,
//                 prefix: true,
//               },
//             },
//           },
//         },
//       },
//     })
//     .then((tasks) => tasks.map((task) => parseTask(task)));

//   const timesheetEntriesPromise = prisma.timesheetEntry.findMany({
//     where: {
//       workspaceId,
//     },
//     select: {
//       id: true,
//       updatedAt: true,
//       start: true,
//       end: true,
//       description: true,
//       togglTimeEntryId: true,
//       task: {
//         select: {
//           id: true,
//           name: true,
//           projectId: true,
//           ticketForTask: {
//             select: {
//               id: true,
//               number: true,
//               taskPrefix: {
//                 select: {
//                   id: true,
//                   prefix: true,
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   return Promise.all([projectsPromise, tasksPromise, timesheetEntriesPromise]);
// };
