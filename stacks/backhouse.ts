import { StackContext, use } from 'sst/constructs';
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

export const Backhouse = ({ stack }: StackContext) => {
  const { vpc } = use(Network);
  const { hostedZone } = use(Dns);
  const { cluster } = use(Ecs);

  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);
  const { elastiCacheAccessPolicy, bullmqElastiCache } = use(BullmqElastiCache);

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  const taskRole = new iam.Role(stack, 'BackhouseTaskRole', {
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

  const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'BackhouseTaskDefinition', {
    taskRole,
  });

  const dockerImageAsset = new DockerImageAsset(stack, 'BackhouseDockerImageAsset', {
    directory: '.',
    file: 'Dockerfile.backhouse',
    // never cache this image
    buildArgs: {
      CACHEBUST: new Date().toISOString(),
    },
  });

  const rawDatabaseUrl = makeDatabaseUrl();

  // A tarballed image exists at dist/backhouse.tar.gz
  taskDefinition.addContainer('BackhouseContainer', {
    image: ecs.ContainerImage.fromDockerImageAsset(dockerImageAsset),
    memoryLimitMiB: 200,
    logging: new ecs.AwsLogDriver({
      streamPrefix: 'BackhouseEcsContainer',
    }),
    environment: {
      DATABASE_URL: rawDatabaseUrl,
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

  const service = new ecs.Ec2Service(stack, 'BackhouseService', {
    cluster,
    taskDefinition,
    serviceName: 'backhouse-service',
  });

  // allow traffic from inside the vpc
  service.connections.allowFrom(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.allTraffic(), 'allow all traffic from vpc');

  // allow all outbound traffic
  service.connections.allowTo(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'allow all outbound traffic');
};
