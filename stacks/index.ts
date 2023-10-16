import type * as sst from 'sst/constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { BastionHost } from './bastionHost';
import { Database } from './database';
import { DatabaseMigrations } from './database-migrations';
import { Dns } from './dns';
import { Layers } from './layers';
import { Network } from './network';
import { Web } from './web';
import { BullmqElastiCache } from './bullmq-elasticache';
import { Ecs } from './ecs';
import { Scheduler } from './scheduler';
import { JobLambda } from './job-lambda';

// deal with dynamic imports of node built-ins (e.g. "crypto")
// from https://github.com/evanw/esbuild/pull/2067#issuecomment-1073039746
// and hardcode __dirname for https://github.com/prisma/prisma/issues/14484
export const ESM_REQUIRE_SHIM = `await(async()=>{let{dirname:e}=await import("path"),{fileURLToPath:i}=await import("url");if(typeof globalThis.__filename>"u"&&(globalThis.__filename=i(import.meta.url)),typeof globalThis.__dirname>"u"&&(globalThis.__dirname='/var/task'),typeof globalThis.require>"u"){let{default:a}=await import("module");globalThis.require=a.createRequire(import.meta.url)}})();`;

export const RUNTIME = Runtime.NODEJS_18_X;

export default function main(app: sst.App) {
  app.setDefaultFunctionProps({
    runtime: 'nodejs18.x',
  });

  app
    .stack(Network)
    .stack(Dns)
    .stack(Layers)
    .stack(Database)
    .stack(BullmqElastiCache)
    .stack(BastionHost)
    .stack(DatabaseMigrations)
    .stack(JobLambda)
    .stack(Ecs)
    .stack(Scheduler)
    .stack(Web);
}
