import {
  type StackContext,
  Function as SSTFunction,
  use,
} from "sst/constructs";
import { sstEnv } from "./lib";
import { Database, makeDatabaseUrl } from "./database";
import { Network } from "./network";
import { Dns } from "./dns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { LAYER_MODULES, Layers } from "./layers";

const jobLambdaSizes = {
  small: "320 MB",
  medium: "1024 MB",
  large: "2048 MB",
} as const;

export const JobLambda = ({ stack }: StackContext) => {
  const { vpc } = use(Network);
  const { fqdn } = use(Dns);
  const { prismaLayer } = use(Layers);

  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } =
    use(Database);
  if (!database.secret) {
    throw new Error("Database secret not found");
  }

  const jobLambdaConfigBase = {
    handler: "packages/backhouse/src/integrations/index.handleIntegrationsJob",
    vpc,
    enableLiveDev: false,
    environment: {
      NODE_ENV: "production",
      DATABASE_URL: makeDatabaseUrl({
        connectionLimit: 10,
      }),
      NEXTAUTH_URL: `https://${fqdn}`,
      NEXTAUTH_SECRET: sstEnv.NEXTAUTH_SECRET,
      CONFIG_SECRET_KEY: sstEnv.CONFIG_SECRET_KEY,
      GOOGLE_CLIENT_ID: sstEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: sstEnv.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_REGION: stack.region,
      DB_SECRET_ARN: database.secret.secretArn,
      NEXT_PUBLIC_URL: `https://${fqdn}`,
      NEXT_PUBLIC_DEV_TOOLS_ENABLED:
        sstEnv.NEXT_PUBLIC_DEV_TOOLS_ENABLED.toString(),
      ...prismaLayer.environment,
    },
    timeout: "15 minutes" as const,
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    nodejs: {
      format: "cjs" as const,
      esbuild: {
        external: LAYER_MODULES.concat(prismaLayer.externalModules),
      },
    },
    copyFiles: [
      { from: "packages/web/prisma/schema.prisma" },
      {
        from: "packages/web/prisma/schema.prisma",
        to: "packages/backhouse/src/integrations/schema.prisma",
      },
    ],
    initialPolicy: [databaseAccessPolicy, secretsManagerAccessPolicy],
  };

  const jobLambdas: Record<keyof typeof jobLambdaSizes, SSTFunction> =
    Object.entries(jobLambdaSizes).reduce(
      (acc, [size, memorySize]) => ({
        ...acc,
        [size]: new SSTFunction(stack, `JobLambda${size}`, {
          ...jobLambdaConfigBase,
          memorySize,
        }),
      }),
      {} as Record<keyof typeof jobLambdaSizes, SSTFunction>
    );

  Object.values(jobLambdas).forEach((jobLambda) =>
    jobLambda.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.allTraffic(),
      "allow all traffic from vpc"
    )
  );

  // allow all outbound traffic
  Object.values(jobLambdas).forEach((jobLambda) =>
    jobLambda.connections.allowTo(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTraffic(),
      "allow all outbound traffic"
    )
  );

  // Create a policy that allows invoking this lambda from the scheduler
  const jobLambdaInvokePolicyStatement = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["lambda:InvokeFunction"],
    resources: Object.values(jobLambdas).map(
      (jobLambda) => jobLambda.functionArn
    ),
  });

  return {
    jobLambdas,
    jobLambdaInvokePolicyStatement,
  };
};
