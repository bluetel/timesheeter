import { StackContext } from 'sst/constructs';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { sstEnv } from './lib';

export function Dns({ stack, app }: StackContext) {
  // capitalise the first letter of the stage
  const appStageFormatted = `${app.stage[0].toUpperCase()}${app.stage.slice(1)}`;

  // Create a new hosted zone
  const hostedZone = new HostedZone(stack, `HostedZone${appStageFormatted}`, {
    // No VPCs are associated with this hosted zone as it is a public zone
    zoneName: sstEnv.HOSTED_ZONE,
  });

  const certificate = new Certificate(stack, `Certificate${appStageFormatted}`, {
    domainName: hostedZone.zoneName,
    validation: CertificateValidation.fromDns(hostedZone),
  });

  return {
    certificate,
    hostedZone,
  };
}
