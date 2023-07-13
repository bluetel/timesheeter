# Timesheeter

Fully serverless open source timesheeting app designed to be deployed to AWS.

## Quickstart

```shell
nvm use
npm install -g pnpm
pnpm install
pnpm dev
```

Login to the AWS CLI

Then make a .env.local file (see .env.example)

Environment variables named .env.staging and .env.production will be used for those environments.

Don't write secrets to .env files, these are deployed to production.

It might take a few minutes to deploy the first time/setup.

After a while you will be asked to cd into packages/web and run `pnpm dev:web` to start the frontend dev server, this links into SST's live lambda development.

## Features

- 🌩 [Serverless Stack](https://serverless-stack.com/) - powerful CDK developer experience tools
- 🌤 [AWS CDK](https://aws.amazon.com/cdk/) - cloud-native infrastructure as code
- ፨ [TRPC](https://trpc.io/) - RPC over HTTP and full type safety
- 🖥 [NextJS](https://nextjs.org/) frontend wuth Tailwind CSS
  - 🔓 [NextAuth.js](https://next-auth.js.org/) - authentication and session management
- 💾 [Prisma ORM](https://www.prisma.io/docs/)
  - 📚 Prisma engine lambda layer
  - 📜 Prisma DB migration CDK script
  - 🐳 Database integration test setup with postgres in docker
- 🔋 [Aurora Serverless RDS](https://aws.amazon.com/rds/aurora/serverless/) PostgreSQL
- ⚡️ [Live local lambda development](https://docs.serverless-stack.com/live-lambda-development) (`pnpm dev`)
  - 🐞 [Lambda debugging](https://docs.sst.dev/live-lambda-development#debugging-with-visual-studio-code) - set breakpoints on your lambda functions and step through in your IDE
- 📦 [pnpm](https://pnpm.io/) - fast and correct package manager
- 🚅 [vitest](https://vitest.dev/) - fast tests
- 🐛 [ES Modules](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)
- 🔧 [ESBuild](https://esbuild.github.io/) - fast code bundling on backend (under the hood) with tree-shaking
- 🫙 [Middy](https://middy.js.org/) - middleware for Lambda functions
- 🛠 [AWS Lambda Powertools](https://awslabs.github.io/aws-lambda-powertools-typescript/latest/) - for [custom metrics](https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/metrics/), [structured logging](https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/logger/), and [tracing](https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/tracer/).

## Package scripts

Please see [package.json](package.json) `scripts` for more.

### Start live backend dev server with AWS

```shell
pnpm dev
```

### Start Nextjs frontend dev server

```shell
pnpm dev:web
```

### Run/generate DB migrations locally

```shell
pnpm db:migrate:dev
```

### Just watch and perform type-checking

```shell
pnpm watch
```

### Deploy to your AWS environment

```shell
pnpm deploy
```

### Deploy to specific AWS environment (region/profile)

```shell
pnpm deploy --region eu-west-1 --profile dev
```

### All SST/CDK commands

```shell
pnpm exec sst
pnpm exec cdk
```
