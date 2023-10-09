import { type StackContext } from 'sst/constructs';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export function Network({ stack, app }: StackContext) {
  const vpc = new Vpc(stack, app.logicalPrefixedName('net'), { natGateways: 1 });

  const defaultLambdaSecurityGroup = new SecurityGroup(stack, 'DefaultLambda', {
    vpc,
    description: 'Default security group for lambda functions',
    allowAllOutbound: true,
  });

  // allow all traffic from vpc
  defaultLambdaSecurityGroup.addIngressRule(
    ec2.Peer.ipv4(vpc.vpcCidrBlock),
    ec2.Port.allTraffic(),
    'allow all traffic from vpc'
  );

  app.setDefaultFunctionProps({
    vpc,
    securityGroups: [defaultLambdaSecurityGroup],
  });

  return { vpc, defaultLambdaSecurityGroup };
}
