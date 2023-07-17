import { StackContext, use } from 'sst/constructs';
import { Network } from './network';
import { Database } from './database';
import { DbMigrationScript } from './resources/migrationScript';

export function DatabaseMigrations({ stack, app }: StackContext) {
  const net = use(Network);
  const { database, secretsManagerAccessPolicy } = use(Database);

  // run migrations
  new DbMigrationScript(stack, 'MigrationScript', {
    vpc: net.vpc,
    dbSecretsArn: database.secret!.secretArn,
    dbSecretsManagerAccessPolicy: secretsManagerAccessPolicy,
  });
}
