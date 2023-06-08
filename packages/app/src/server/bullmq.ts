import { Queue, RedisConnection } from "bullmq";
import { env } from "@timesheeter/app/env.mjs";

const bullmqConfig = {
  connection: {
    host: env.BULLMQ_REDIS_HOST,
    port: parseInt(env.BULLMQ_REDIS_PORT),
    password: env.BULLMQ_REDIS_PASSWORD,
  },
};

export const integrationsQueue = new Queue(
  "integrations",
  bullmqConfig,
  RedisConnection
);
