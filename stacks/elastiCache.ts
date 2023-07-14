import { Config, StackContext, use } from 'sst/constructs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Network } from 'stacks/network';
import { sstEnv } from './env';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export function ElastiCache({ stack, app }: StackContext) {
  const elastiCacheName = `${sstEnv.APP_NAME}-bullmq`;
  const net = use(Network);

  const elastiCacheSubnetGroup = new elasticache.CfnSubnetGroup(stack, 'bullmq-subnet-group', {
    description: 'bullmq subnet group',
    subnetIds: net.vpc.privateSubnets.map((subnet) => subnet.subnetId),
  });

  const elasticCacheSecurityGroup = new ec2.SecurityGroup(stack, 'bullmq-security-group', {
    vpc: net.vpc,
    description: 'bullmq security group',
    allowAllOutbound: true,
  });

  const elastiCache = new elasticache.CfnCacheCluster(stack, 'bullmq', {
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
    ElastiCacheAddress: { value: elastiCache.attrRedisEndpointAddress },
    ElastiCacheName: { value: elastiCacheName },
  });

  const config = [
    new Config.Parameter(stack, 'BULLMQ_REDIS_PATH', {
      value: elastiCache.attrRedisEndpointAddress,
    }),
  ];

  app.addDefaultFunctionBinding(config);

  // Redis connection for local dev can be overridden
  // https://docs.sst.dev/environment-variables#is_local
  const localBullmqRedisPath = process.env['BULLMQ_REDIS_PATH'];
  if (process.env.IS_LOCAL && localBullmqRedisPath) {
    app.addDefaultFunctionEnv({
      ['BULLMQ_REDIS_PATH']: localBullmqRedisPath,
    });
  }

  const elastiCacheAccessPolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['elasticache:DescribeCacheClusters'],
    resources: [elastiCache.ref],
  });

  return { elastiCache, elastiCacheAccessPolicy };
}
