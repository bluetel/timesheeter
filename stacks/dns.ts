import { type StackContext } from 'sst/constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { sstEnv } from './lib';

export function Dns({ stack }: StackContext) {
  // Import the hosted zone from the aws account
  const hostedZone = HostedZone.fromLookup(stack, 'HostedZone', {
    domainName: sstEnv.HOSTED_ZONE,
  });

  const fqdn = `${sstEnv.APP_SUBDOMAIN_PARTS}.${hostedZone.zoneName}`;

  return { fqdn, hostedZone };
}
