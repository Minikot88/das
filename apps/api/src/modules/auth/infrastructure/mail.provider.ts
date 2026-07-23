import { Inject, Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import type { MailProvider } from '../application/mail-provider.js';

@Injectable()
export class RuntimeMailProvider implements MailProvider {
  private readonly transport?: Transporter;

  constructor(@Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) {}

  async sendPasswordReset(email: string, token: string) {
    if (this.deliveryDisabled()) return;
    const link = this.link('/login', 'reset', token);
    await this.deliver(email, 'Reset your DashboardMiniBi password',
      `Open this one-time link to reset your password: ${link}`,
      `<p>Open this one-time link to reset your password:</p><p><a href="${escapeHtml(link)}">Reset password</a></p>`);
  }

  async sendInvitation(email: string, token: string) {
    if (this.deliveryDisabled()) return;
    const link = this.link('/register', 'token', token);
    await this.deliver(email, 'Your DashboardMiniBi invitation',
      `Open this one-time link to accept your invitation: ${link}`,
      `<p>Open this one-time link to accept your invitation:</p><p><a href="${escapeHtml(link)}">Accept invitation</a></p>`);
  }

  private deliveryDisabled() {
    if (this.environment.smtp.enabled) return false;
    if (this.environment.nodeEnv === 'production') throw new Error('SMTP delivery is disabled');
    return true;
  }

  private link(path: string, parameter: string, token: string) {
    if (!this.environment.appUrl) throw new Error('APP_URL is required for email delivery');
    const url = new URL(path, `${this.environment.appUrl.replace(/\/$/, '')}/`);
    url.searchParams.set(parameter, token);
    return url.toString();
  }

  private async deliver(to: string, subject: string, text: string, html: string) {
    assertEmail(to);
    const transport = this.transport || nodemailer.createTransport({
      host: this.environment.smtp.host,
      port: this.environment.smtp.port,
      secure: this.environment.smtp.secure,
      auth: { user: this.environment.smtp.user, pass: this.environment.smtp.password },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const message = { from: this.environment.smtp.from, to, subject, text, html, disableFileAccess: true, disableUrlAccess: true };
    try {
      await transport.sendMail(message);
    } catch {
      await transport.sendMail(message);
    }
  }
}

function assertEmail(value: string) {
  if (/\r|\n/.test(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email address');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}
