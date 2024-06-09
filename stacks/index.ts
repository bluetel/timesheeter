import type * as sst from 'sst/constructs';
import { BastionHost } from './bastionHost';
import { Database } from './database';
import { DatabaseMigrations } from './database-migrations';
import { Dns } from './dns';
import { Layers } from './layers';
import { Network } from './network';
import { Web } from './web';
import { Scheduler } from './scheduler';
import { JobLambda } from './job-lambda';
import { Tags } from 'aws-cdk-lib';

export default function main(app: sst.App) {
  Tags.of(app).add('timesheeter', `${app.stage}-${app.region}`);

  app.setDefaultFunctionProps({
    runtime: 'nodejs18.x',
  });

  app
    .stack(Network)
    .stack(Dns)
    .stack(Layers)
    .stack(Database)
    .stack(BastionHost)
    .stack(DatabaseMigrations)
    .stack(JobLambda)
    .stack(Scheduler);
  // .stack(Web);
}
