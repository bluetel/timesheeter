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

const worker = new Worker<IntegrationJob>("integrations", handleIntegrationsJob, {
    connection: connectionConfig,
});

// Error handler is required to prevent unhandled errors from crashing the worker
worker.on("error", (error) => {
    // log the error
    console.error("Error in worker", error);
});

const bullBoardApp = fastify();
const serverAdapter = new FastifyAdapter();

createBullBoard({
    queues: [
        new BullMQAdapter(
            // @ts-ignore - Types have separate declarations of a private property '_repeat'.
            new Queue("integrations", {
                connection: connectionConfig,
            })
        ),
    ],
    serverAdapter,
});

bullBoardApp.register(serverAdapter.registerPlugin());
bullBoardApp.listen({ port: env.BULL_BOARD_PORT, host: "0.0.0.0" });

console.log(`BullBoard running on http://0.0.0.0:${env.BULL_BOARD_PORT}`);
