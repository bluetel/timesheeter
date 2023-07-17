import { Config, RDS, StackContext, use } from 'sst/constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Network } from './network';
import { sstEnv } from './env';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib';

export function Database({ stack, app }: StackContext) {
  const net = use(Network);

  const defaultDatabaseName = sstEnv.APP_NAME;

  const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'database-security-group', {
    vpc: net.vpc,
    description: 'database security group',
    allowAllOutbound: true,
  });

  databaseSecurityGroup.addIngressRule(
    ec2.Peer.ipv4(net.vpc.vpcCidrBlock),
    ec2.Port.allTraffic(),
    'allow all traffic from vpc'
  );

  const database = new rds.DatabaseInstance(stack, 'main', {
    engine: rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_15,
    }),
    vpc: net.vpc,
    subnetGroup: net.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
    securityGroups: [databaseSecurityGroup],
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
    multiAz: false,
    allocatedStorage: 10,
    storageType: rds.StorageType.GP2,
    deletionProtection: app.stage === 'production',
    removalPolicy: app.stage === 'production' ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY,
  });

  // output the address of the database
  stack.addOutputs({
    DatabaseAddress: { value: database.dbInstanceEndpointAddress },
    DatabaseName: { value: defaultDatabaseName },
  });

  database.connections.allowDefaultPortFrom(net.defaultLambdaSecurityGroup, 'Allow access from lambda functions');

  const prismaConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT || 5;

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  const config = [
    new Config.Parameter(stack, 'DATABASE_NAME', { value: defaultDatabaseName }),
    new Config.Parameter(stack, 'DB_ARN', { value: database.instanceArn }),
    new Config.Parameter(stack, 'DB_SECRET_ARN', { value: database.secret.secretArn }),
    new Config.Parameter(stack, 'PRISMA_CONNECTION_LIMIT', { value: prismaConnectionLimit.toString() ?? '' }),
  ];

  stack.addOutputs({
    DBName: { value: defaultDatabaseName, description: 'Name of the default database' },
    GetSecretsCommand: {
      value: `aws secretsmanager get-secret-value --region ${stack.region} --secret-id ${database.secret.secretArn} --query SecretString --output text`,
      description: 'Command to get DB connection info and credentials',
    },
  });

  app.addDefaultFunctionBinding(config);

  // DB connection for local dev can be overridden
  // https://docs.sst.dev/environment-variables#is_local
  const localDatabaseUrl = process.env['DATABASE_URL'];
  if (sstEnv.IS_LOCAL && localDatabaseUrl) {
    app.addDefaultFunctionEnv({
      ['DATABASE_URL']: localDatabaseUrl,
    });
  }

  const databaseAccessPolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['rds-db:*'],
    resources: [database.instanceArn],
  });

  const secretsManagerAccessPolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [database.secret.secretArn],
  });

  app.addDefaultFunctionPermissions([databaseAccessPolicy, secretsManagerAccessPolicy]);

  return {
    database,
    databaseAccessPolicy,
    defaultDatabaseName,
    secretsManagerAccessPolicy,
    secretArn: database.secret.secretArn,
  };
}

/**
 * Generate a database connection string (DSN).
 */
export function makeDatabaseUrl() {
  const prismaConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? 5;

  const { database, defaultDatabaseName } = use(Database);

  const dbUsername = database.secret?.secretValueFromJson('username');
  const dbPassword = database.secret?.secretValueFromJson('password');

  return `postgresql://${dbUsername}:${dbPassword}@${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}/${defaultDatabaseName}?connection_limit=${prismaConnectionLimit}`;
}
