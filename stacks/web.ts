import { NextjsSite, StackContext, use } from 'sst/constructs';
import { sstEnv } from './lib';
import { Database, makeDatabaseUrl } from './database';
import { BullmqElastiCache } from './bullmq-elasticache';
import { Network } from './network';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Dns } from './dns';

export function Web({ stack, app }: StackContext) {
  const { hostedZone } = use(Dns);
  const { vpc } = use(Network);
  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);
  const { bullmqElastiCache, elastiCacheAccessPolicy } = use(BullmqElastiCache);

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  // docs: https://docs.serverless-stack.com/constructs/NextjsSite
  const frontendSite = new NextjsSite(stack, 'Web', {
    path: 'packages/web',
    // Use the root hosted zone
    customDomain: {
      domainName: hostedZone.zoneName,
      cdk: {
        hostedZone,
      },
    },
    cdk: {
      distribution: {
        comment: `NextJS distribution for ${app.name} (${app.stage})`,
      },
      server: {
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnetType: SubnetType.PUBLIC }),
      },
      revalidation: {
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnetType: SubnetType.PUBLIC }),
      },
    },
    memorySize: 1024,
    environment: {
      DATABASE_URL: makeDatabaseUrl(),
      NEXTAUTH_URL: sstEnv.NEXTAUTH_URL,
      NEXTAUTH_SECRET: sstEnv.NEXTAUTH_SECRET,
      CONFIG_SECRET_KEY: sstEnv.CONFIG_SECRET_KEY,
      GOOGLE_CLIENT_ID: sstEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: sstEnv.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_REGION: stack.region,
      BULLMQ_REDIS_PATH: bullmqElastiCache.attrRedisEndpointAddress,
      BULLMQ_REDIS_PORT: bullmqElastiCache.attrRedisEndpointPort,
      DB_SECRET_ARN: database.secret.secretArn,
      RESEND_API_KEY: sstEnv.RESEND_API_KEY,
      NEXT_PUBLIC_URL: `https://${hostedZone.zoneName}`,
    },
  });

  frontendSite.attachPermissions([databaseAccessPolicy, secretsManagerAccessPolicy, elastiCacheAccessPolicy]);

  stack.addOutputs({
    WebURL: frontendSite.customDomainUrl || frontendSite.url || 'unknown',
  });

  return { frontendSite };
}
