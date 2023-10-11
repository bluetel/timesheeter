import { type StackContext, Function, use } from 'sst/constructs';
import { sstEnv } from './lib';
import { Database, makeDatabaseUrl } from './database';
import { BullmqElastiCache } from './bullmq-elasticache';
import { Network } from './network';
import { Dns } from './dns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export const JobLambda = ({ stack }: StackContext) => {
  const { vpc } = use(Network);
  const { hostedZone } = use(Dns);
  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);
  const { elastiCacheAccessPolicy, bullmqElastiCache } = use(BullmqElastiCache);

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  const jobLambda = new Function(stack, 'JobLambda', {
    handler: 'packages/backhouse/src/integrations/index.handleIntegrationsJob',
    vpc,
    enableLiveDev: false,
    environment: {
      DATABASE_URL: makeDatabaseUrl({
        connectionLimit: 10,
      }),
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
      NEXT_PUBLIC_DEV_TOOLS_ENABLED: sstEnv.NEXT_PUBLIC_DEV_TOOLS_ENABLED.toString(),
    },
    timeout: '15 minutes',
    memorySize: '2 GB',
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  });

  jobLambda.addToRolePolicy(secretsManagerAccessPolicy);
  jobLambda.addToRolePolicy(databaseAccessPolicy);
  jobLambda.addToRolePolicy(elastiCacheAccessPolicy);

  // allow traffic from inside the vpc
  jobLambda.connections.allowFrom(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.allTraffic(), 'allow all traffic from vpc');

  // allow all outbound traffic
  jobLambda.connections.allowTo(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'allow all outbound traffic');

  // Create a policy that allows invoking this lambda from the scheduler
  const invokePolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['lambda:InvokeFunction'],
    resources: [jobLambda.functionArn],
  });

  return {
    jobLambda,
    invokePolicy,
  };
};
