import { RemovalPolicy } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { App, Function, Script } from 'sst/constructs';
import { PRISMA_VERSION } from '../layers';
import { PrismaLayer } from './prismaLayer';

interface DbMigrationScriptProps {
  vpc?: IVpc;
  dbSecretsArn: string;
}

export class DbMigrationScript extends Construct {
  constructor(scope: Construct, id: string, { vpc, dbSecretsArn }: DbMigrationScriptProps) {
    super(scope, id);

    const app = App.of(scope) as App;

    // lambda layer for migrations
    const migrationLayer = new PrismaLayer(this, 'PrismaMigrateLayer', {
      // retain for rollbacks
      removalPolicy: RemovalPolicy.RETAIN,
      description: 'Prisma migration engine and SDK',
      layerVersionName: app.logicalPrefixedName('prisma-migrate'),

      prismaVersion: PRISMA_VERSION,
      prismaEngines: ['migration-engine'],
      prismaModules: ['@prisma/engines', '@prisma/internals', '@prisma/client'],
    });

    const migrationFunction = new Function(this, 'MigrationScriptLambda', {
      vpc,
      enableLiveDev: false,
      handler: 'packages/web/src/repo/runMigrations.handler',
      layers: [migrationLayer],
      copyFiles: [
        { from: 'packages/web/prisma/schema.prisma' },
        { from: 'packages/web/prisma/migrations' },
        { from: 'packages/web/prisma/schema.prisma', to: 'packages/web/src/repo/schema.prisma' },
        { from: 'packages/web/prisma/migrations', to: 'packages/web/src/repo/migrations' },
        { from: 'packages/web/package.json', to: 'packages/web/src/package.json' },
      ],

      nodejs: {
        format: 'cjs',
        esbuild: { external: [...(migrationLayer.externalModules || [])] },
      },
      timeout: '3 minutes',
      environment: {
        DB_SECRET_ARN: dbSecretsArn,
      },
    });

    // script to run migrations for us during deployment
    new Script(this, 'MigrationScript', {
      onCreate: migrationFunction,
      onUpdate: migrationFunction,
    });
  }
}
