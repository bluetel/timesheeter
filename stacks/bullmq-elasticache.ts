import { Config, type StackContext, use } from 'sst/constructs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Network } from './network';
import { sstEnv } from './lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export function BullmqElastiCache({ stack, app }: StackContext) {
  const elastiCacheName = `${sstEnv.APP_NAME}-${app.stage}-elasticache-bullmq`;
  const { vpc } = use(Network);

  const elastiCacheSubnetGroup = new elasticache.CfnSubnetGroup(stack, 'bullmq-subnet-group', {
    description: 'bullmq subnet group',
    subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
  });

  const elasticCacheSecurityGroup = new ec2.SecurityGroup(stack, 'bullmq-security-group', {
    vpc,
    description: 'bullmq security group',
    allowAllOutbound: true,
  });

  elasticCacheSecurityGroup.addIngressRule(
    ec2.Peer.ipv4(vpc.vpcCidrBlock),
    ec2.Port.allTraffic(),
    'allow all traffic from vpc'
  );

  const bullmqElastiCache = new elasticache.CfnCacheCluster(stack, 'bullmq', {
    clusterName: elastiCacheName,
    cacheSubnetGroupName: elastiCacheSubnetGroup.ref,
    vpcSecurityGroupIds: [elasticCacheSecurityGroup.securityGroupId],
    cacheNodeType: 'cache.t4g.micro',
    engine: 'redis',
    numCacheNodes: 1,
    engineVersion: '6.x',
    autoMinorVersionUpgrade: true,
    preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
    snapshotRetentionLimit: 10,
    snapshotWindow: '00:00-01:00',
  });

  // output the address of the database
  stack.addOutputs({
    ElastiCacheAddress: { value: bullmqElastiCache.attrRedisEndpointAddress },
    ElastiCacheName: { value: elastiCacheName },
  });

  const config = [
    new Config.Parameter(stack, 'BULLMQ_REDIS_PATH', {
      value: bullmqElastiCache.attrRedisEndpointAddress,
    }),
  ];

  app.addDefaultFunctionBinding(config);

  // Redis connection for local dev can be overridden
  // https://docs.sst.dev/environment-variables#is_local
  const localBullmqRedisPath = process.env['BULLMQ_REDIS_PATH'];
  if (sstEnv.IS_LOCAL && localBullmqRedisPath) {
    app.addDefaultFunctionEnv({
      ['BULLMQ_REDIS_PATH']: localBullmqRedisPath,
    });
  }

  const elasticacheArn = `arn:aws:elasticache:${stack.region}:${stack.account}:cluster:${elastiCacheName}`;

  const elastiCacheAccessPolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['*'],
    resources: [elasticacheArn],
  });

  app.addDefaultFunctionPermissions([elastiCacheAccessPolicy]);

  return { bullmqElastiCache, elastiCacheAccessPolicy };
}
