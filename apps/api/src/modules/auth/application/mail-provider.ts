export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

export interface MailProvider {
  sendPasswordReset(email: string, token: string): Promise<void>;
  sendInvitation(email: string, token: string): Promise<void>;
}
