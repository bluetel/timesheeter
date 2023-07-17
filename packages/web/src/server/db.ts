import { PrismaClient } from '@prisma/client';
import { env } from '@timesheeter/web/env';

let prismaClient: PrismaClient | undefined;

export const getPrismaClient = async (): Promise<PrismaClient> => {
  if (prismaClient) return prismaClient;

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

  const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
    });

  if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

  prismaClient = prisma;

  return new Promise((resolve) => resolve(prisma));
};
