import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { gmail_v1, google } from 'googleapis';
import * as MailComposer from 'nodemailer/lib/mail-composer';

@Injectable()
export class MailService {
  private clientId: string;
  private clientSecret: string;
  private gmail: gmail_v1.Gmail;

  constructor(private readonly configService: ConfigService) {
    this.clientId = configService.get<string>('CLIENT_ID');
    this.clientSecret = configService.get<string>('CLIENT_SECRET');

    const auth = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      '/callback',
    );
    auth.setCredentials({
      refresh_token: configService.get<string>('REFRESH_TOKEN'),
    });

    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async sendMail(options: {
    from?: string;
    to: string;
    cc?: string;
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    const rawMessage = await this.createMail({
      from: '"NCKH - AQA" <21520946@gm.uit.edu.vn>',
      textEncoding: 'base64',
      ...options,
    });
    const { data: { id } = {} } = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });
    return id;
  }

  private async encodeMessage(message) {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async createMail(options) {
    const mailComposer = new MailComposer(options);
    const message = await mailComposer.compile().build();
    return this.encodeMessage(message);
  }
}
