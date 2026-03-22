import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass: password,
      },
    });

    this.logger.log('Email transporter initialized');
  }

  async sendPasswordRecoveryEmail(
    toEmail: string,
    userName: string,
    recoveryLink: string,
  ): Promise<void> {
    try {
      const fromName = this.configService.get<string>('SMTP_FROM_NAME');
      const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');

      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: toEmail,
        subject: 'Recuperação de Senha - TecnoAging',
        html: this.getPasswordRecoveryEmailTemplate(userName, recoveryLink),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password recovery email sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password recovery email to ${toEmail}`,
        error,
      );
      throw error;
    }
  }

  private getPasswordRecoveryEmailTemplate(
    userName: string,
    recoveryLink: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background-color: #2d5a7b;
              color: #ffffff;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px;
              color: #333333;
            }
            .content p {
              line-height: 1.6;
              margin: 10px 0;
            }
            .cta-button {
              display: inline-block;
              padding: 12px 30px;
              margin: 20px 0;
              background-color: #2d5a7b;
              color: #ffffff;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
            }
            .cta-button:hover {
              background-color: #1f3f54;
            }
            .footer {
              background-color: #f8f8f8;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666666;
            }
            .link-text {
              word-break: break-all;
              color: #2d5a7b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperação de Senha</h1>
            </div>
            <div class="content">
              <p>Olá ${userName},</p>
              <p>Você solicitou a recuperação de senha para sua conta no TecnoAging.</p>
              <p>Clique no botão abaixo para redefinir sua senha:</p>
              <a href="${recoveryLink}" class="cta-button">Redefinir Senha</a>
              <p>Ou copie e cole o link abaixo em seu navegador:</p>
              <p class="link-text">${recoveryLink}</p>
              <p><strong>Nota:</strong> Este link é válido por 24 horas.</p>
              <p>Se você não solicitou a recuperação de senha, ignore este email.</p>
              <p>Atenciosamente,<br>Equipe TecnoAging</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; 2026 TecnoAging. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
