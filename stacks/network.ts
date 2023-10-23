import { type App, type Stack, type StackContext } from 'sst/constructs';
import { SecurityGroup, Vpc, InstanceType, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export const Network = ({ stack, app }: StackContext) => {
  const natGatewayProvider = ec2.NatProvider.instance({
    instanceType: InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
  });

  // Create the VPC without NAT Gateways
  const vpc = new Vpc(stack, app.logicalPrefixedName('net'), { natGateways: 1, natGatewayProvider });

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
