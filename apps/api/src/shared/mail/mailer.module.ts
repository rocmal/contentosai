import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER } from './mailer.interface';
import { NodemailerMailer } from './nodemailer.mailer';
import { BrevoApiMailer } from './brevo-api.mailer';

@Global()
@Module({
  providers: [
    {
      provide: MAILER,
      inject: [ConfigService],
      // MAIL_TRANSPORT=brevo-api sends over HTTPS (for hosts that block SMTP);
      // anything else keeps the SMTP transport.
      useFactory: (config: ConfigService) =>
        config.get<string>('mail.transport') === 'brevo-api'
          ? new BrevoApiMailer(config)
          : new NodemailerMailer(config),
    },
  ],
  exports: [MAILER],
})
export class MailerModule {}
