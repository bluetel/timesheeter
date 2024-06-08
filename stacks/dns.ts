import { type StackContext } from 'sst/constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { sstEnv } from './lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export function Dns({ stack }: StackContext) {
  // Import the hosted zone from the aws account
  const hostedZone = HostedZone.fromLookup(stack, 'HostedZone', {
    domainName: sstEnv.HOSTED_ZONE,
  });

  const fqdn = `${sstEnv.APP_SUBDOMAIN_PARTS}.${hostedZone.zoneName}`;

  // Make a certificate for the domain
  const certificate = new acm.Certificate(stack, 'Certificate', {
    domainName: fqdn,
    validation: acm.CertificateValidation.fromDns(hostedZone),
  });

  return { fqdn, hostedZone, certificate };
}
