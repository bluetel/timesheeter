// import { Config, RDS, StackContext, use } from 'sst/constructs';
// import * as ecs from 'aws-cdk-lib/aws-ecs';
// import { Network } from 'stacks/network';
// import * as rds from 'aws-cdk-lib/aws-rds';
// import * as ec2 from 'aws-cdk-lib/aws-ec2';

// export const ECS = ({ stack, app }: StackContext) => {
//   const net = use(Network);

//   // Create an RDS database

//   const cluster = new ecs.Cluster(stack, 'Cluster', {
//     vpc: net.vpc,
//   });

//   // ADD A new redis instance to the ecs
