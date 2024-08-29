import { env } from '../env';
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import * as nodemailer from 'nodemailer';

const brevoInstance = new TransactionalEmailsApi();

// brevoInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, env.BREVO_API_KEY);

// @ts-expect-error - bad types
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const apiKey = brevoInstance.authentications['apiKey'];
apiKey.apiKey = env.BREVO_API_KEY;

const transport = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: '7a57e8001@smtp-brevo.com',
    pass: 'I7f5GMDRxjqrvcV8',
  },
});

export const send = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  await transport.sendMail({
    to,
    subject,
    html,
    text,
  });
};
