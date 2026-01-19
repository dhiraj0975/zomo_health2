import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
require('dotenv').config();
interface MailObject {
  receiver_email: string;
  sender_email: string;
  cc: string;
  subject: string;
}
@Injectable()
export class Mailer {
  private transporter;
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT, 10),
      timeout: 30,
      tls: true,
      auth: {
        user: process.env.EMAIL_SMTP_USERNAME,
        pass: process.env.EMAIL_SMTP_PASSWORD,
      },
    });
  }
  // Send email method with optional attachments
  sendEmail = async (mailObject: MailObject, content: any = ' ', attachment: Array<{ path: string, filename: string }> | null = null) => {
    try {
      let emailObject = {
        to: mailObject?.receiver_email,
        cc: mailObject?.cc,
        from: mailObject?.sender_email,
        subject: mailObject?.subject,
      };
      if (attachment && attachment.length > 0) {
        await Promise.all(attachment.map(async (att) => {
          if (!fs.existsSync(att.path)) {
            throw new Error(`Attachment path does not exist: ${att.path}`);
          }
          if (!att.filename) {
            att.filename = att.path.split('/').pop();
          }
        }));
        emailObject['attachments'] = Array.isArray(attachment) ? attachment : [attachment];
      }
      if (content) {
        emailObject['html'] = content
      }
      return await this.transporter.sendMail(emailObject);
    } catch (error) {
      return { error: true, message: error.message, errordata: error  };
    }
  }
}
export default new Mailer()
