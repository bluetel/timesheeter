import { StackContext, use } from 'sst/constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Network } from './network';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';

export const Ecs = ({ stack }: StackContext) => {
  const net = use(Network);

  const cluster = new ecs.Cluster(stack, 'TimesheeterEcsCluster', {
    vpc: net.vpc,
    containerInsights: true,
  });

  const asg = new autoscaling.AutoScalingGroup(stack, 'TimesheeterEcsASG', {
    vpc: net.vpc,
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
    minCapacity: 1,
    maxCapacity: 2,
    machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
    securityGroup: net.defaultLambdaSecurityGroup,
    desiredCapacity: 1,
    healthCheck: autoscaling.HealthCheck.ec2({ grace: cdk.Duration.minutes(5) }),
  });

  const capacityProvider = new ecs.AsgCapacityProvider(stack, 'TimesheeterEcsCapacityProvider', {
    autoScalingGroup: asg,
    enableManagedTerminationProtection: false,
  });

  cluster.addAsgCapacityProvider(capacityProvider);

  return { cluster };
};
