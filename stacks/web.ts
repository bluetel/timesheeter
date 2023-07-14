import { NextjsSite, StackContext, use } from 'sst/constructs';
import { Dns } from './dns';
import { sstEnv } from './env';
import { Database, makeDatabaseUrl } from './database';

export function Web({ stack, app }: StackContext) {
  const dns = use(Dns);
  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);

  // docs: https://docs.serverless-stack.com/constructs/NextjsSite
  const frontendSite = new NextjsSite(stack, 'Web', {
    // These 2 are being handled differently for some reason
    path: 'packages/web',
    customDomain: dns.domainName
      ? {
          domainName: dns.domainName,
          domainAlias: 'www.' + dns.domainName,
        }
      : undefined,
    cdk: {
      distribution: {
        comment: `NextJS distribution for ${app.name} (${app.stage})`,
      },
    },
    memorySize: 1024,
    // Validated in packages/web/src/env.ts, example in .env.example
    environment: {
      DATABASE_URL: makeDatabaseUrl(),
      NEXTAUTH_URL: sstEnv.NEXTAUTH_URL,
      NEXTAUTH_SECRET: sstEnv.NEXTAUTH_SECRET,
      CONFIG_SECRET_KEY: sstEnv.CONFIG_SECRET_KEY,
      GOOGLE_CLIENT_ID: sstEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: sstEnv.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_REGION: stack.region,
    },
  });

  frontendSite.attachPermissions([databaseAccessPolicy, secretsManagerAccessPolicy]);

  stack.addOutputs({
    WebURL: frontendSite.customDomainUrl || frontendSite.url || 'unknown',
  });

  return { frontendSite };
}
