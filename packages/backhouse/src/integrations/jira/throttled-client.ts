import JiraApi from 'jira-client';

/** Wrapper around findIssue method thats rate limited to 1 request per second, returns the same result as the original method */
export class ThrottledJiraClient {
  private readonly jiraClient: JiraApi;
  private readonly queue: (() => Promise<unknown>)[] = [];
  private isRunning = false;

  constructor(options: JiraApi.JiraApiOptions) {
    this.jiraClient = new JiraApi(options);
  }

  async findIssue(issueNumber: string) {
    return this.enqueue(() => this.jiraClient.findIssue(issueNumber));
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isRunning) {
        this.run().catch((error) => {
          console.error('Error in ThrottledJiraClient', error);
        });
      }
    });
  }

  private async run() {
    this.isRunning = true;

    while (this.queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await this.queue.shift()!();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.isRunning = false;
  }
}
