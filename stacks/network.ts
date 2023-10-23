import { type App, type Stack, type StackContext } from 'sst/constructs';
import { SecurityGroup, Vpc, InstanceType, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SimpleNAT } from 'cdk-construct-simple-nat';

export const Network = ({ stack, app }: StackContext) => {
  // Create the VPC without NAT Gateways
  const vpc = new Vpc(stack, app.logicalPrefixedName('net'), { natGateways: 0 });

  new SimpleNAT(stack, 'SimpleNAT', {
    vpc,
    instanceType: InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.NANO),
  });

  const { defaultLambdaSecurityGroup } = configureLambdaDefaults({ stack, app, vpc });

  return { vpc, defaultLambdaSecurityGroup };
};

const configureLambdaDefaults = ({ stack, app, vpc }: { stack: Stack; app: App; vpc: Vpc }) => {
  const defaultLambdaSecurityGroup = new SecurityGroup(stack, 'DefaultLambda', {
    vpc,
    description: 'Default security group for lambda functions',
    allowAllOutbound: true,
  });

  // allow all traffic from vpc
  defaultLambdaSecurityGroup.addIngressRule(
    Peer.ipv4(vpc.vpcCidrBlock),
    Port.allTraffic(),
    'allow all traffic from vpc'
  );

  app.setDefaultFunctionProps({
    vpc,
    securityGroups: [defaultLambdaSecurityGroup],
  });

  return { defaultLambdaSecurityGroup };
};
