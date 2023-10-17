# Timesheeter

Serverless open source timesheeting app designed to be deployed to AWS.

Supports 2 way bi-directional sync with Toggl, ticketing information from Jira, and outputting to Google Sheets.

## Quickstart

```shell
cp .env.example .env.local # You will need to add some fields, those already filled in are setup for local dev already
nvm use
npm install -g pnpm
pnpm install
pnpm local:containers:up # Pulls and starts local dev containers

cd packages/web
pnpm migrate # Applies migrations to local db and generates prisma client
pnpm dev

# In a new terminal
cd packages/backhouse && pnpm dev
```
