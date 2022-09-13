// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
import sgMail from '@sendgrid/mail';
import { sendgrid } from '../constants';

sgMail.setApiKey(sendgrid.apiKey);

export async function sendMail(): Promise<boolean> {
  const msg = {
    to: 'hashilekky@gmail.com', // Change to your recipient
    from: 'lekky@lunamarket.io', // Change to your verified sender
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',

  };
  await sgMail.send(msg);
  return true;
}

// sendMail();
export const sendgridMail = sgMail;
