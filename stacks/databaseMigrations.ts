import { StackContext, use } from 'sst/constructs';
import { Network } from './network';
import { Database } from './database';
import { DbMigrationScript } from './resources/migrationScript';

export function DatabaseMigrations({ stack, app }: StackContext) {
  const net = use(Network);
  const { database, secretsManagerAccessPolicy } = use(Database);

  if (!database.secret) {
    throw new Error('Database secret not found');
  }

  // run migrations
  const migrationScript = new DbMigrationScript(stack, 'MigrationScript', {
    vpc: net.vpc,
    dbSecretsArn: database.secret.secretArn,
    dbSecretsManagerAccessPolicy: secretsManagerAccessPolicy,
  });

  stack.addOutputs({
    // Make a command that calls the migration script
    MigrationCommand: {
      value: `aws lambda invoke --function-name ${migrationScript.functionName} /dev/stdout`,
    },
  });
}
