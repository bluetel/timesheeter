import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type TimesheeterInviteUserEmailProps = {
  email: string;
  workspaceName: string;
  inviteLink: string;
}

const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';

export const TimesheeterInviteUserEmail = ({
  email = 'harrytwigg111@gmail.com',
  workspaceName = 'My Project',
  inviteLink = 'https://vercel.com/teams/invite/foo',
}: TimesheeterInviteUserEmailProps) => {
  const previewText = `Join ${workspaceName} on Timesheeter`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="my-auto mx-auto bg-white font-sans">
          <Container className="my-[40px] mx-auto w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/static/logo.png`}
                width="75"
                height="75"
                alt="Timesheeter"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="my-[30px] mx-0 p-0 text-center text-[24px] font-normal text-black">
              Join <strong>{workspaceName}</strong> on <strong>Timesheeter</strong>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">Hello {email},</Text>
            <Text className="text-[14px] leading-[24px] text-black">
              You have been invited to join the <strong>{workspaceName}</strong> team on <strong>Timesheeter</strong>.
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                pX={20}
                pY={12}
                className="rounded bg-[#000000] text-center text-[12px] font-semibold text-white no-underline"
                href={inviteLink}
              >
                Join {workspaceName} on Timesheeter
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              or copy and paste this URL into your browser:{' '}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Hr className="my-[26px] mx-0 w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This invitation was intended for <span className="text-black">{email} </span>.If you were not expecting this invitation, you
              can ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default TimesheeterInviteUserEmail;
