import { SSTConfig } from "sst";

const awsRegionCodes = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "af-south-1",
    "ap-east-1",
    "ap-south-1",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ca-central-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-south-1",
    "eu-west-3",
    "eu-north-1",
    "me-south-1",
    "sa-east-1",
] as const;

type AwsRegionCode = (typeof awsRegionCodes)[number];

const config = {
    config(input) {
        const stage = input.stage ?? "dev";

        return {
            name: "timesheeter",
            region: "eu-west-2" as AwsRegionCode,
            stage,
        };
    },
    async stacks(app) {
        const appStacks = await import("./stacks");
        appStacks.default(app);
    },
} satisfies SSTConfig;

export default config;
