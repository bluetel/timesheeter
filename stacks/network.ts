import { type Stack, type StackContext } from 'sst/constructs';
import { SecurityGroup, Vpc, Instance, InstanceType, MachineImage, SubnetType, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SpotInstance } from 'cdk-ec2-spot-simple';
import { createCostOptimizedInstance } from './resources/spot-optimized-instance';

export const Network = ({ stack, app }: StackContext) => {
  // Create the VPC without NAT Gateways
  const vpc = new Vpc(stack, app.logicalPrefixedName('net'), { natGateways: 0 });

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

  const natInstance = createNatInstance({ stack, vpc });

  // After defining the NAT instance:
  (natInstance.node.defaultChild as ec2.CfnInstance).sourceDestCheck = false;

  const privateSubnets = vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS });

  // Update private subnets' routing tables to point to the NAT instance
  privateSubnets.subnetIds.forEach((subnetId) => {
    const subnet = ec2.Subnet.fromSubnetAttributes(stack, `ImportedSubnet${subnetId}`, {
      subnetId: subnetId,
    });

    // Note: This assumes that each private subnet has its own unique route table.
    // If they share a route table, we'll add duplicate routes and encounter an error.
    new ec2.CfnRoute(stack, `RouteForNAT${subnetId}`, {
      routeTableId: subnet.routeTable.routeTableId,
      destinationCidrBlock: '0.0.0.0/0',
      instanceId: natInstance.instanceId,
    });
  });

  app.setDefaultFunctionProps({
    vpc,
    securityGroups: [defaultLambdaSecurityGroup],
  });

  return { vpc, defaultLambdaSecurityGroup };
};

const createNatInstance = ({ stack, vpc }: { stack: Stack; vpc: Vpc }) => {
  const ec2Config: ec2.InstanceProps = {
    instanceType: InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
    machineImage: MachineImage.lookup({
      name: 'amzn-ami-vpc-nat-hvm-*',
      owners: ['amazon'],
    }),
    vpc: vpc,
    vpcSubnets: {
      subnetType: SubnetType.PUBLIC,
    },
  };

  return createCostOptimizedInstance({ stack, instanceConfig: ec2Config });
};
