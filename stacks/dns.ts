import { type StackContext } from 'sst/constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { sstEnv } from './lib';

export function Dns({ stack, app }: StackContext) {
  // capitalise the first letter of the stage
  const appStageFormatted = `${app.stage[0].toUpperCase()}${app.stage.slice(1)}`;

  // Import the hosted zone from the aws account
  const hostedZone = HostedZone.fromLookup(stack, `HostedZone${appStageFormatted}`, {
    domainName: sstEnv.HOSTED_ZONE,
  });

  const fqdn = `${sstEnv.APP_SUBDOMAIN_PARTS}.${hostedZone.zoneName}`;

  return { fqdn, hostedZone };
}
