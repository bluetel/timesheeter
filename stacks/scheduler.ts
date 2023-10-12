import { type StackContext, use } from 'sst/constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { sstEnv } from './lib';
import { Database, makeDatabaseUrl } from './database';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BullmqElastiCache } from './bullmq-elasticache';
import { Ecs } from './ecs';
import { Network } from './network';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Dns } from './dns';
import { JobLambda } from './job-lambda';

export const Scheduler = ({ stack }: StackContext) => {
  const { vpc } = use(Network);
  const { hostedZone } = use(Dns);
  const { cluster } = use(Ecs);

  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);
  const { elastiCacheAccessPolicy, bullmqElastiCache } = use(BullmqElastiCache);

  const { jobLambda, invokePolicy } = use(JobLambda);

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  const taskRole = new iam.Role(stack, 'SchedulerTaskRole', {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  });

  const taskPolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['ecs:RunTask'],
    resources: [cluster.clusterArn],
  });

  taskRole.addToPolicy(taskPolicy);

  // make new policy from policystatement

  taskRole.addToPolicy(databaseAccessPolicy);
  taskRole.addToPolicy(elastiCacheAccessPolicy);
  taskRole.addToPolicy(secretsManagerAccessPolicy);
  taskRole.addToPolicy(invokePolicy);

  const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'SchedulerTaskDefinition', {
    taskRole,
  });

  const dockerImageAsset = new DockerImageAsset(stack, 'SchedulerDockerImageAsset', {
    directory: '.',
    file: 'Dockerfile.scheduler',
  });

  taskDefinition.addContainer('SchedulerContainer', {
    image: ecs.ContainerImage.fromDockerImageAsset(dockerImageAsset),
    memoryReservationMiB: 850,
    logging: new ecs.AwsLogDriver({
      streamPrefix: 'SchedulerEcsContainer',
    }),
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
      JOB_LAMBDA_ARN: jobLambda.functionArn,
      AWS_REGION: stack.region,
    },
  });

  const service = new ecs.Ec2Service(stack, 'SchedulerService', {
    cluster,
    taskDefinition,
    serviceName: 'scheduler-service',
  });

  // allow traffic from inside the vpc
  service.connections.allowFrom(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.allTraffic(), 'allow all traffic from vpc');

  // allow all outbound traffic
  service.connections.allowTo(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'allow all outbound traffic');
};
