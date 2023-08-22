import { type PrismaClient } from '@timesheeter/web/server';

export const INTEGRATION_RUN_HELP_TEXT = 'Shows historical integration runs and logging info';

export type IntegrationRunLogLevel = 'INFO' | 'WARN' | 'ERROR';

type IntegrationRunLogEntry = {
  time: Date;
  level: IntegrationRunLogLevel;
  message: string;
};

export class IntegrationRunLogger {
  private integrationId: string;
  private workspaceId: string;

  private logs: IntegrationRunLogEntry[] = [];
  private prisma: PrismaClient;

  constructor({
    integrationId,
    workspaceId,
    prisma,
  }: {
    integrationId: string;
    workspaceId: string;
    prisma: PrismaClient;
  }) {
    this.integrationId = integrationId;
    this.workspaceId = workspaceId;
    this.prisma = prisma;
  }

  private log(level: IntegrationRunLogLevel, message: string): void {
    this.logs.push({ time: new Date(), level, message });
  }

  public info(message: string): void {
    this.log('INFO', message);
  }

  public warn(message: string): void {
    this.log('WARN', message);
  }

  public error(message: string): void {
    this.log('ERROR', message);
  }

  public getLogs(): IntegrationRunLogEntry[] {
    return this.logs;
  }

  public async saveRun(): Promise<void> {
    await this.prisma.integrationRun.create({
      data: {
        workspaceId: this.workspaceId,
        integrationId: this.integrationId,
        logsSerialized: JSON.stringify(this.logs),
      },
    });
  }
}
