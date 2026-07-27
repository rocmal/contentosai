export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

export const MAILER = Symbol('MAILER');

export interface IMailer {
  send(input: SendMailInput): Promise<void>;
}
