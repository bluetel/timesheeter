import { NextjsSite, StackContext, use } from 'sst/constructs';
import { sstEnv } from './env';
import { Database, makeDatabaseUrl } from './database';
import { BullmqElastiCache } from './bullmq-elasticache';
import { Network } from './network';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';

export async function Web({ stack, app }: StackContext) {
  const { vpc } = use(Network);
  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);
  const { bullmqElastiCache, elastiCacheAccessPolicy } = use(BullmqElastiCache);

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  if (sstEnv.EXTERNAL_DOMAIN && !sstEnv.EXTERNAL_CERT_ARN) {
    throw new Error('EXTERNAL_CERT_ARN must be set when using EXTERNAL_DOMAIN');
  }

  // docs: https://docs.serverless-stack.com/constructs/NextjsSite
  const frontendSite = new NextjsSite(stack, 'Web', {
    path: 'packages/web',
    customDomain: {
      domainName: sstEnv.PUBLIC_URL,
      isExternalDomain: sstEnv.EXTERNAL_DOMAIN,
      cdk: sstEnv.EXTERNAL_DOMAIN
        ? {
            certificate: Certificate.fromCertificateArn(
              stack,
              `FrontendCert-${app.stage}`,
              sstEnv.EXTERNAL_CERT_ARN as string
            ),
          }
        : undefined,
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
    },
  });

  frontendSite.attachPermissions([databaseAccessPolicy, secretsManagerAccessPolicy, elastiCacheAccessPolicy]);

  stack.addOutputs({
    WebURL: frontendSite.customDomainUrl || frontendSite.url || 'unknown',
  });

  return { frontendSite };
}
