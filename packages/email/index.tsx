import TimesheeterInviteUserEmail, { TimesheeterInviteUserEmailProps } from './emails/invite-to-timesheeter';
import { render } from '@react-email/render';

export const inviteEmail = (data: TimesheeterInviteUserEmailProps) => ({
  pretty: render(<TimesheeterInviteUserEmail {...data} />, {
    pretty: true,
  }),
  plainText: render(<TimesheeterInviteUserEmail {...data} />, {
    plainText: true,
  }),
  title: `Invite to join ${data.workspaceName} on Timesheeter`,
});
