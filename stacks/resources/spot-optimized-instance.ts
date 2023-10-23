import { type Stack } from 'sst/constructs';
import { Instance } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SpotInstance } from 'cdk-ec2-spot-simple';

export const createCostOptimizedInstance = ({
  stack,
  instanceConfig,
}: {
  stack: Stack;
  instanceConfig: ec2.InstanceProps;
}) => {
  if (stack.stage === 'production') {
    // Create the NAT instance in a public subnet
    return new Instance(stack, 'NatInstance', instanceConfig);
  }

  return new SpotInstance(stack, 'NatInstance', {
    ...instanceConfig,
    spotOptions: {
      interruptionBehavior: ec2.SpotInstanceInterruption.TERMINATE,
      // Set to somethng high e.g. the old Nat Gateway price
      maxPrice: 0.045,
    },
  });
};
