import { type StackContext, use, Function } from "sst/constructs";
import { sstEnv } from "./lib";
import { Database, makeDatabaseUrl } from "./database";
import { Network } from "./network";
import { Dns } from "./dns";
import { JobLambda } from "./job-lambda";
import { LAYER_MODULES, Layers } from "./layers";
import * as events from "aws-cdk-lib/aws-events";
import * as cdk from "aws-cdk-lib";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export const Scheduler = ({ stack }: StackContext) => {
  const { vpc } = use(Network);
  const { fqdn } = use(Dns);
  const { prismaLayer } = use(Layers);

  const { database, databaseAccessPolicy, secretsManagerAccessPolicy } =
    use(Database);
  if (!database.secret) {
    throw new Error("Database secret not found");
  }

  const { jobLambdas, jobLambdaInvokePolicyStatement } = use(JobLambda);

  const schedulerLambda = new Function(stack, "SchedulerLambda", {
    handler: "packages/backhouse/src/scheduler-app.scheduleIntegrations",
    vpc,
    enableLiveDev: false,
    environment: {
      DATABASE_URL: makeDatabaseUrl({
        connectionLimit: 10,
      }),
      NODE_ENV: "production",
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
      JOB_LAMBDA_SMALL_ARN: jobLambdas["small"].functionArn,
      JOB_LAMBDA_MEDIUM_ARN: jobLambdas["medium"].functionArn,
      JOB_LAMBDA_LARGE_ARN: jobLambdas["large"].functionArn,
      ...prismaLayer.environment,
    },
    timeout: "2 minutes",
    memorySize: "192 MB",
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    nodejs: {
      format: "cjs",
      esbuild: {
        external: LAYER_MODULES.concat(prismaLayer.externalModules),
      },
    },
    copyFiles: [
      { from: "packages/web/prisma/schema.prisma" },
      {
        from: "packages/web/prisma/schema.prisma",
        to: "packages/backhouse/src/schema.prisma",
      },
    ],
    initialPolicy: [
      jobLambdaInvokePolicyStatement,
      databaseAccessPolicy,
      secretsManagerAccessPolicy,
    ],
  });

  const schedulerRule = new events.Rule(stack, "SchedulerRule", {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
  });

  schedulerRule.addTarget(new eventsTargets.LambdaFunction(schedulerLambda));
};
