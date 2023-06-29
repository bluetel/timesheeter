import dotenv from "dotenv";
dotenv.config();

import { type IntegrationJob, connectionConfig, env } from "@timesheeter/app";
import { Worker, Queue } from "bullmq";
import { handleIntegrationsJob } from "@timesheeter/backhouse/integrations";
import fastify from "fastify";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";

console.log("Starting Backhouse Worker");

const worker = new Worker<IntegrationJob, unknown>("integrations", handleIntegrationsJob, {
    connection: connectionConfig,
});

// Error handler is required to prevent unhandled errors from crashing the worker
worker.on("error", (error) => {
    // log the error
    console.error("Error in worker", error);
});

// create fastify app listening on port 9999
const bullBoardApp = fastify();
const serverAdapter = new FastifyAdapter();

const queue = new Queue<IntegrationJob, unknown>("integrations", {
    connection: connectionConfig,
});

createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter,
});

bullBoardApp.register(serverAdapter.registerPlugin());
bullBoardApp.listen({ port: env.BULL_BOARD_PORT });

console.log(`BullBoard running on http://localhost:${env.BULL_BOARD_PORT}`);
