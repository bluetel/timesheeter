import { NextjsSite, StackContext, use } from 'sst/constructs';
import { Dns } from './dns';
import { sstEnv } from './env';

export function Web({ stack, app }: StackContext) {
  const dns = use(Dns);

  // docs: https://docs.serverless-stack.com/constructs/NextjsSite
  const frontendSite = new NextjsSite(stack, 'Web', {
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
      NEXTAUTH_URL: sstEnv.NEXTAUTH_URL, // FIXME: how to pass in this URL?
      NEXT_PUBLIC_REGION: stack.region,
    },
  });

  stack.addOutputs({
    WebURL: frontendSite.customDomainUrl || frontendSite.url || 'unknown',
  });
}
