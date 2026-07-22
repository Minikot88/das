import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));

import { RuntimeMailProvider } from './mail.provider.js';

const environment = {
  nodeEnv: 'production', appUrl: 'https://dashboard.example.test',
  smtp: { enabled: true, host: 'mailpit', port: 1025, secure: false, user: 'mailer', password: 'smtp-password', from: 'Dashboard BI <noreply@example.test>' },
};

describe('RuntimeMailProvider', () => {
  beforeEach(() => sendMail.mockReset());

  it('retries a transient SMTP failure and sends reset links without unsafe external content', async () => {
    sendMail.mockRejectedValueOnce(new Error('temporary SMTP failure')).mockResolvedValueOnce({ messageId: 'mail-1' });
    const provider = new RuntimeMailProvider(environment as never);
    await provider.sendPasswordReset('user@example.test', 'opaque/reset token');
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[1][0]).toMatchObject({ to: 'user@example.test', subject: 'Reset your DashboardMiniBi password' });
    expect(sendMail.mock.calls[1][0].text).toContain('https://dashboard.example.test/login?reset=opaque%2Freset+token');
    expect(sendMail.mock.calls[1][0]).toMatchObject({ disableFileAccess: true, disableUrlAccess: true });
  });

  it('rejects CRLF email header injection before opening SMTP delivery', async () => {
    const provider = new RuntimeMailProvider(environment as never);
    await expect(provider.sendInvitation('victim@example.test\r\nBcc: attacker@example.test', 'invite-token')).rejects.toThrow(/email/i);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('does not require APP_URL when SMTP delivery is disabled outside production', async () => {
    const provider = new RuntimeMailProvider({ nodeEnv: 'test', smtp: { enabled: false } } as never);
    await expect(provider.sendPasswordReset('user@example.test', 'reset-token')).resolves.toBeUndefined();
    await expect(provider.sendInvitation('user@example.test', 'invite-token')).resolves.toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
