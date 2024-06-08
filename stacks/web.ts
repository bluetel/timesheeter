import { NextjsSite, type StackContext, use } from 'sst/constructs';
import { sstEnv } from './lib';
import { Database, makeDatabaseUrl } from './database';
import { Network } from './network';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Dns } from './dns';

export const Web = ({ stack, app }: StackContext) => {
  const { fqdn } = use(Dns);
  const { vpc } = use(Network);
  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  // docs: https://docs.serverless-stack.com/constructs/NextjsSite
  const frontendSite = new NextjsSite(stack, 'Web', {
    path: 'packages/web',
    // Use the root hosted zone
    customDomain: {
      domainName: fqdn,
    },
    cdk: {
      distribution: {
        comment: `NextJS distribution for ${app.name} (${app.stage})`,
      },
      server: {
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }),
      },
      revalidation: {
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }),
      },
    },
    memorySize: 1024,
    environment: {
      DATABASE_URL: makeDatabaseUrl(),
      NEXTAUTH_URL: `https://${fqdn}`,
      NEXTAUTH_SECRET: sstEnv.NEXTAUTH_SECRET,
      CONFIG_SECRET_KEY: sstEnv.CONFIG_SECRET_KEY,
      GOOGLE_CLIENT_ID: sstEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: sstEnv.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_REGION: stack.region,
      DB_SECRET_ARN: database.secret.secretArn,
      RESEND_API_KEY: sstEnv.RESEND_API_KEY,
      NEXT_PUBLIC_URL: `https://${fqdn}`,
      NEXT_PUBLIC_DEV_TOOLS_ENABLED: sstEnv.NEXT_PUBLIC_DEV_TOOLS_ENABLED.toString(),
    },
  });

  frontendSite.attachPermissions([databaseAccessPolicy, secretsManagerAccessPolicy]);

  stack.addOutputs({
    WebURL: frontendSite.customDomainUrl || frontendSite.url || 'unknown',
  });

  return { frontendSite };
};
