import { type StackContext, Function, use } from 'sst/constructs';
import { sstEnv } from './lib';
import { Database, makeDatabaseUrl } from './database';
import { Network } from './network';
import { Dns } from './dns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LAYER_MODULES, Layers } from './layers';

export const JobLambda = ({ stack }: StackContext) => {
  const { vpc } = use(Network);
  const { hostedZone } = use(Dns);
  const { prismaLayer } = use(Layers);

  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } = use(Database);
  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  const jobLambdaConfigBase = {
    handler: 'packages/backhouse/src/integrations/index.handleIntegrationsJob',
    vpc,
    enableLiveDev: false,
    environment: {
      NODE_ENV: 'production',
      DATABASE_URL: makeDatabaseUrl({
        connectionLimit: 10,
      }),
      NEXTAUTH_URL: sstEnv.NEXTAUTH_URL,
      NEXTAUTH_SECRET: sstEnv.NEXTAUTH_SECRET,
      CONFIG_SECRET_KEY: sstEnv.CONFIG_SECRET_KEY,
      GOOGLE_CLIENT_ID: sstEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: sstEnv.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_REGION: stack.region,
      DB_SECRET_ARN: database.secret.secretArn,
      RESEND_API_KEY: sstEnv.RESEND_API_KEY,
      NEXT_PUBLIC_URL: `https://${hostedZone.zoneName}`,
      NEXT_PUBLIC_DEV_TOOLS_ENABLED: sstEnv.NEXT_PUBLIC_DEV_TOOLS_ENABLED.toString(),
      ...prismaLayer.environment,
    },
    timeout: '15 minutes' as const,
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    nodejs: {
      format: 'cjs' as const,
      esbuild: {
        external: LAYER_MODULES.concat(prismaLayer.externalModules),
      },
    },
    copyFiles: [
      { from: 'packages/web/prisma/schema.prisma' },
      { from: 'packages/web/prisma/schema.prisma', to: 'packages/backhouse/src/integrations/schema.prisma' },
    ],
    initialPolicy: [databaseAccessPolicy, secretsManagerAccessPolicy],
  };

  const jobLambdaSmall = new Function(stack, 'JobLambdaSmall', {
    ...jobLambdaConfigBase,
    memorySize: '384 MB',
  });

  const jobLambdaLarge = new Function(stack, 'JobLambdaLarge', {
    ...jobLambdaConfigBase,
    memorySize: '2048 MB',
  });

  // allow traffic from inside the vpc
  const jobLambdas = [jobLambdaSmall, jobLambdaLarge];

  jobLambdas.forEach((jobLambda) =>
    jobLambda.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.allTraffic(),
      'allow all traffic from vpc'
    )
  );

  // allow all outbound traffic
  jobLambdas.forEach((jobLambda) =>
    jobLambda.connections.allowTo(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'allow all outbound traffic')
  );

  // Create a policy that allows invoking this lambda from the scheduler
  const jobLambdaInvokePolicyStatement = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['lambda:InvokeFunction'],
    resources: jobLambdas.map((jobLambda) => jobLambda.functionArn),
  });

  return {
    jobLambdaSmall,
    jobLambdaLarge,
    jobLambdaInvokePolicyStatement,
  };
};
