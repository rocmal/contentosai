import { Global, Module } from '@nestjs/common';
import { MAILER } from './mailer.interface';
import { NodemailerMailer } from './nodemailer.mailer';

@Global()
@Module({
  providers: [{ provide: MAILER, useClass: NodemailerMailer }],
  exports: [MAILER],
})
export class MailerModule {}
